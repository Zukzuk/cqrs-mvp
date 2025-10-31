import { TCalendarCommandUnion } from "@daveloper/interfaces";
import { getSocket } from "../../socket";

type Ack = (r: { status: "ok" | "error"; error?: string }) => void;

export function useCalendarCommand(userId: string, cmd: TCalendarCommandUnion): Promise<void> {
    const socket = getSocket(userId);
    const message = { ...cmd } as TCalendarCommandUnion;
    return new Promise<void>((resolve, reject) => {
        socket.emit("calendar_command", message, (ack: Parameters<Ack>[0]) => {
            if (ack?.status === "ok") return resolve();
            return reject(new Error(ack?.error || "command failed"));
        });
    });
}