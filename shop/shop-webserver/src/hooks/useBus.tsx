import { useEffect, useMemo, useState } from "react";
import { getSocket } from "../socket";

export function useBus({ userId }: { userId: string }) {
    const sock = useMemo(() => getSocket(userId), [userId]);
    const [connected, setConnected] = useState(sock.connected);
    useEffect(() => {
        const onConnect = () => setConnected(true);
        const onDisconnect = () => setConnected(false);
        sock.on("connect", onConnect);
        sock.on("disconnect", onDisconnect);
        return () => {
            sock.off("connect", onConnect);
            sock.off("disconnect", onDisconnect);
        };
    }, [sock]);
    return { socket: sock, connected };
}