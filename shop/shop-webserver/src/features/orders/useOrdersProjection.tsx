import { useEffect, useMemo, useState } from "react";
import { getSocket } from "../../socket";
import type { TShopOrdersDocument } from "@daveloper/interfaces";

export function useOrdersProjection(userId: string) {
    const socket = useMemo(() => getSocket(userId), [userId]);
    const [orders, setOrders] = useState<TShopOrdersDocument[]>([]);

    useEffect(() => {
        function onSnapshot(payload: TShopOrdersDocument[]) {
            const cleaned = (Array.isArray(payload) ? payload : [])
                .filter(Boolean)
                .map((o: any) => ({ ...o, orderId: String(o.orderId ?? "") }));
            setOrders(cleaned);
        }
        function onUpdate(order: any) {
            if (!order || order.userId !== userId) return;
            const normalized = { ...order, orderId: String(order.orderId ?? "") } as TShopOrdersDocument;
            setOrders((prev) => {
                const safePrev = prev.filter(Boolean);
                const rest = safePrev.filter(o => String(o.orderId) !== normalized.orderId);
                return [...rest, normalized];
            });
        }

        // Register event listeners
        socket.on("orders_snapshot", onSnapshot);
        socket.on("order_update", onUpdate);

        // Ask for snapshot now and on reconnect
        const ask = () => socket.emit("orders_get_snapshot", { userId });
        ask(); // on mount
        socket.on("connect", ask); // on (re)connect

        return () => {
            socket.off("orders_snapshot", onSnapshot);
            socket.off("order_update", onUpdate);
            socket.off("connect", ask);
        };
    }, [socket, userId]);

    // Sort defensively by shippedAt desc, then by orderId as string
    const sorted = useMemo(() => {
        return orders
            .slice()
            .sort((a, b) => {
                const sa = a.shippedAt ?? "";
                const sb = b.shippedAt ?? "";
                const byShip = sb.localeCompare(sa);
                if (byShip !== 0) return byShip;
                return String(a.orderId ?? "").localeCompare(String(b.orderId ?? ""));
            });
    }, [orders]);

    return { orders: sorted };
}