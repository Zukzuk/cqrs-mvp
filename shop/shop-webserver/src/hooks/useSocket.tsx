import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket(userId: string) {
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const socket = io("/", {
            path: "/socket.io",
            transports: ["websocket"],
            auth: { userId },
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
        });
        socketRef.current = socket;

        const onConnect = () => setConnected(true);
        const onDisconnect = () => setConnected(false);
        const onError = (err: any) => console.error("connect_error:", err?.message || err);

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("connect_error", onError);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("connect_error", onError);
            socket.disconnect();
        };
    }, [userId]);

    return { socket: socketRef, connected };
}
