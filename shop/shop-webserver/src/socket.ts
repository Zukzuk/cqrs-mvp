import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(userId: string): Socket {
    if (socket) return socket;
    // Connect to same-origin /socket.io (nginx proxies to BFF)
    socket = io("/", { transports: ["websocket"], auth: { userId } });
    return socket;
}