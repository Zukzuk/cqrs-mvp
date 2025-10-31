import { useEffect, useMemo } from "react";
import { Badge, Button, Group, Loader, Stack, Table, Text, Title } from "@mantine/core";
import { v4 as uuidv4 } from "uuid";
import { useOrdersProjection } from "./useOrdersProjection";
import { useOrdersCommands } from "./useOrdersCommands";
import { OrdersCommands } from "./OrdersCommands";
import type { ShopOrdersDocument, TOrderCommandUnion } from "@daveloper/interfaces";
import { useRows } from "./useRows";

const USER_ID = "user123";

export type BaseRow = {
    orderId?: string | number | null;
    correlationId?: string | null;
    status?: string | null;
    pending?: boolean;
    updatedAt?: number;
};

export type OrderRow =
    // always present (you provide them)
    BaseRow
    & Pick<ShopOrdersDocument, "orderId" | "status" | "correlationId">
    // may or may not be present depending on the command/snapshot
    & Partial<Pick<ShopOrdersDocument, "userId" | "total" | "carrier" | "trackingNumber" | "shippedAt">>;


export default function OrderPage() {
    const { orders: projectedOrders } = useOrdersProjection(USER_ID);
    const { rows, upsert, replaceSnapshot } = useRows<OrderRow>();

    // Common handler for commands
    const handle = async (cmd: TOrderCommandUnion, correlationId: ShopOrdersDocument["correlationId"], status: ShopOrdersDocument["status"]) => {
        upsert({ ...cmd.payload, correlationId, status }, { pending: true });
        try {
            await useOrdersCommands(USER_ID, { ...cmd, correlationId });
        } catch (err) {
            console.error("ShipOrder failed:", err);
            upsert({ ...cmd.payload, correlationId, status: "FAILED" }, { pending: false });
        }
    };

    // Sorted view (shippedAt desc, then orderId)
    const view = useMemo(
        () =>
            rows.filter(Boolean).slice().sort((a, b) => {
                const aNoTs = !a.shippedAt;
                const bNoTs = !b.shippedAt;
                if (aNoTs !== bNoTs) return aNoTs ? -1 : 1; // no timestamp on top
                // both have timestamps → newest first
                if (!aNoTs && !bNoTs) {
                    const byShip = String(b.shippedAt!).localeCompare(String(a.shippedAt!));
                    if (byShip !== 0) return byShip;
                }
                // both missing shippedAt → fall back to updatedAt desc, then orderId asc
                const byUpdated = (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
                if (byUpdated !== 0) return byUpdated;

                return String(a.orderId ?? "").localeCompare(String(b.orderId ?? ""));
            }),
        [rows]
    );

    // Feed projection into the hook
    useEffect(() => {
        if (projectedOrders?.length) {
            replaceSnapshot(projectedOrders as OrderRow[]);
        }
    }, [projectedOrders, replaceSnapshot]);

    // Handle order command
    const createOrder = async () => {
        const orderId = Date.now().toString();
        const payload = { orderId, userId: USER_ID, total: 1 };
        const correlationId = uuidv4();
        const cmd = OrdersCommands.createOrder(payload);
        handle(cmd, correlationId, "PENDING");
    };

    // Handle ship command
    const shipOrder = async (o: OrderRow) => {
        if (!o.orderId) return;
        const { orderId, userId, correlationId } = o;
        const payload = {
            userId,
            orderId,
            carrier: "DHL",
            trackingNumber: `TRACK-${orderId}`.slice(0, 20),
            shippedAt: new Date().toISOString(),
        };
        const cmd = OrdersCommands.shipOrder(payload);
        handle(cmd, correlationId, "PENDING");
    };

    const statusColor = (status?: string) => {
        switch (status) {
            case "SHIPPED":
                return "Orchid";
            case "FAILED":
                return "Red";
            case "PENDING":
                return "Coral";
            case "CREATED":
                return "SpringGreen";
            default:
                return "RoyalBlue";
        }
    };
    
    return (
        <Stack>
            <Group justify="space-between" align="center">
                <Title order={3}>Orders</Title>
                <Button onClick={createOrder}>Create Order</Button>
            </Group>

            {view.length === 0 ? (
                <Text c="dimmed">
                    No orders yet — click <em>Create Order</em> to emit a <code>CreateOrder</code> command.
                </Text>
            ) : (
                <Table highlightOnHover withTableBorder>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Order ID</Table.Th>
                            <Table.Th>Correlation ID</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th>Total</Table.Th>
                            <Table.Th>Shipped At</Table.Th>
                            <Table.Th>Carrier</Table.Th>
                            <Table.Th>Tracking #</Table.Th>
                            <Table.Th>Actions</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {view.map((o, i) => {
                            const shipped = o.status === "SHIPPED" || !!o.shippedAt;
                            const isPending = !!o.pending || o.status === "PENDING";
                            return (
                                <Table.Tr key={`${o.correlationId ?? o.orderId}-${i}`}>
                                    <Table.Td>{o.orderId}</Table.Td>
                                    <Table.Td>{o.correlationId}</Table.Td>
                                    <Table.Td>
                                        <Badge
                                            color={statusColor(o.status)}
                                            variant="light"
                                            w={100}
                                            leftSection={isPending ? <Loader c="light" size={9} /> : undefined}
                                        >
                                            {o.status}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>{o.total ?? "—"}</Table.Td>
                                    <Table.Td>{o.shippedAt ? new Date(o.shippedAt).toLocaleString() : "—"}</Table.Td>
                                    <Table.Td>{o.carrier ?? "—"}</Table.Td>
                                    <Table.Td>{o.trackingNumber ?? "—"}</Table.Td>
                                    <Table.Td>
                                        <Button
                                            size="xs"
                                            variant="light"
                                            onClick={() => shipOrder(o)}
                                            disabled={isPending || shipped}
                                        >
                                            Ship
                                        </Button>
                                    </Table.Td>
                                </Table.Tr>
                            );
                        })}
                    </Table.Tbody>
                </Table>
            )}
        </Stack>
    );
}
