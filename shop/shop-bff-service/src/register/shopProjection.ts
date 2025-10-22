import { Namespace, Server, Socket } from "socket.io";
import { serviceAuth } from "../auth";
import { SnapshotService } from "../services/SnapshotService";

export function registerShopProjection(
    projectionNs: Namespace,
    io: Server,
    snapshots: SnapshotService
) {
    projectionNs.use(serviceAuth);

    projectionNs.on("connection", (socket: Socket) => {
        console.log(`🔗 [bff] projection connected: ${socket.id}`);

        // projection is up -> trigger first snapshots for all connected users
        socket.on('shop_projection_ready', () => {
            console.log('🟢 projection_ready — requesting first snapshots');
            snapshots.onProjectionConnect();
        });

        // relay from projection to web clients
        socket.on("orders_snapshot", (view: { userId: string; orders: any[] }) => {
            io.to(view.userId).emit("orders_snapshot", view.orders);
        });
        socket.on("order_update", (order: { userId: string;[k: string]: any }) => {
            setTimeout(() => io.to(order.userId).emit("order_update", order), 1000);
        });

        socket.on("calendars_snapshot", (view: { userId: string; calendar: any }) => {
            io.to(view.userId).emit("calendars_snapshot", view.calendar);
        });
        socket.on("calendar_update", (view: { userId: string;[k: string]: any }) => {
            setTimeout(() => io.to(view.userId).emit("calendar_update", view), 1000);
        });

        socket.on("disconnect", () => {
            console.warn(`⚠️ [bff] projection disconnected: ${socket.id}`);
            snapshots.onProjectionDisconnect();
        });
    });
}
