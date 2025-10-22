import { Server, Socket, Namespace } from "socket.io";
import { RabbitMQBroker } from "@daveloper/broker";
import { userAuth } from "../auth";
import { TCalendarCommandUnion } from "@daveloper/interfaces";

// Helper: request snapshots for a single user (orders + calendars)
const requestSnapshotsFor = (userId: string, projectionNs: Namespace) => {
    projectionNs.emit("request_orders_snapshot", { userId });
    projectionNs.emit("request_calendars_snapshot", { userId });
};

// Helper: request snapshots for many users
const requestSnapshotsForMany = (userIds: Iterable<string>, projectionNs: Namespace) => {
    for (const uid of userIds) requestSnapshotsFor(uid, projectionNs);
};

export function registerWebClient(
    io: Server,
    broker: RabbitMQBroker,
    projectionNs: Namespace
) {
    io.use(userAuth);

    // Track web clients and snapshot needs
    const connectedUsers = new Set<string>();
    const pendingSnapshotUsers = new Set<string>();

    // Track projection availability (count instead of boolean to support multiple service sockets)
    let projectionConnCount = 0;
    const isProjectionUp = () => projectionConnCount > 0;

    io.on("connection", (socket: Socket) => {
        const userId = socket.data.userId as string;
        console.log(
            `🔗 [bff] web connected socket=${socket.id} userId=${userId}`
        );
        socket.join(userId);
        connectedUsers.add(userId);

        // If projection is already up, ask immediately for FIRST snapshot
        if (isProjectionUp()) {
            requestSnapshotsFor(userId, projectionNs);
        } else {
            // queue it; will be flushed when projection connects
            pendingSnapshotUsers.add(userId);
        }

        // Explicit order snapshot requests from client (SPA nav, UI retry, etc.)
        socket.on("orders_get_snapshot", (payload?: { userId?: string }) => {
            const uid = payload?.userId || (socket.data.userId as string);
            if (!uid) return;
            if (isProjectionUp()) {
                requestSnapshotsFor(uid, projectionNs);
            } else {
                pendingSnapshotUsers.add(uid);
            }
        });
        socket.on(
            "order_command",
            async (raw: any, ack: (x: any) => void | undefined) => {
                raw.payload.userId = userId;
                try {
                    await broker.send("commands.orders", raw);
                    ack?.({ status: "ok" });
                } catch (e: any) {
                    ack?.({ status: "error", error: e.message });
                }
            }
        );

        // Explicit calendars snapshot requests from client (SPA nav, UI retry, etc.)
        socket.on("calendars_get_snapshot", (payload?: { userId?: string }) => {
            const uid = payload?.userId || (socket.data.userId as string);
            if (!uid) return;
            if (isProjectionUp()) {
                requestSnapshotsFor(uid, projectionNs);
            } else {
                pendingSnapshotUsers.add(uid);
            }
        });
        socket.on(
            "calendar_command",
            async (raw: TCalendarCommandUnion, ack: (x: any) => void | undefined) => {
                if (raw?.payload && "calendarId" in raw.payload) {
                    (raw as any).payload.calendarId = userId;
                }
                try {
                    await broker.send("commands.calendars", raw);
                    ack?.({ status: "ok" });
                } catch (e: any) {
                    ack?.({ status: "error", error: e.message });
                }
            }
        );

        socket.on("disconnect", () => {
            connectedUsers.delete(userId);
            // no need to remove from pending here; if they reconnect they’ll be added again
            console.warn(`⚠️ [bff] web disconnected userId=${userId}`);
        });
    });

    // ---- Projection namespace handling ----
    projectionNs.on("connection", (socket: Socket) => {
        projectionConnCount++;
        console.log(
            `🔗 [bff] projection connected socket=${socket.id} count=${projectionConnCount}`
        );

        // When projection becomes available:
        // 1) FIRST snapshot for all currently connected users (your requirement)
        // 2) Also flush any specifically queued userIds (harmless if overlapping)
        const usersToHydrate = new Set<string>(connectedUsers);
        for (const u of pendingSnapshotUsers) usersToHydrate.add(u);

        if (usersToHydrate.size > 0) {
            requestSnapshotsForMany(usersToHydrate, projectionNs);
            pendingSnapshotUsers.clear(); // flushed
        }

        socket.on("disconnect", () => {
            projectionConnCount = Math.max(0, projectionConnCount - 1);
            console.warn(
                `⚠️ [bff] projection disconnected count=${projectionConnCount}`
            );
        });
    });
}
