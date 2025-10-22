import { Server, Socket, Namespace } from "socket.io";
import { RabbitMQBroker } from "@daveloper/broker";
import { TCalendarCommandUnion } from "@daveloper/interfaces";
import { userAuth } from "../auth";
import { SnapshotService } from "../services/SnapshotService";

export function registerWebClient(
    io: Server,
    broker: RabbitMQBroker,
    projectionNs: Namespace,
    snapshots: SnapshotService
) {
    io.use(userAuth);

    io.on("connection", (socket: Socket) => {
        const userId = socket.data.userId as string;
        console.log(`🔗 [bff] web connected socket=${socket.id} userId=${userId}`);
        socket.join(userId);

        // client up -> intent to snapshot now (queued if projection down)
        snapshots.onWebClientConnect(userId);

        // explicit asks from the client
        socket.on("orders_get_snapshot", (payload?: { userId?: string }) => {
            snapshots.onClientRequest(payload?.userId || userId);
        });
        
        socket.on("calendars_get_snapshot", (payload?: { userId?: string }) => {
            snapshots.onClientRequest(payload?.userId || userId);
        });

        // commands passthrough
        socket.on("order_command", async (raw, ack) => {
            raw.payload.userId = userId;
            try { await broker.send("commands.orders", raw); ack?.({ status: "ok" }); }
            catch (e: any) { ack?.({ status: "error", error: e.message }); }
        });

        socket.on("calendar_command", async (raw: TCalendarCommandUnion, ack) => {
            if (raw?.payload && "calendarId" in raw.payload) (raw as any).payload.calendarId = userId;
            try { await broker.send("commands.calendars", raw); ack?.({ status: "ok" }); }
            catch (e: any) { ack?.({ status: "error", error: e.message }); }
        });

        socket.on("disconnect", () => {
            console.warn(`⚠️ [bff] web disconnected userId=${userId}`);
            snapshots.onWebClientDisconnect(userId);
        });
    });
}
