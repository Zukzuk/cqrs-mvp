import { v4 as uuid } from "uuid";
import { TOrderCommandUnion } from "@daveloper/interfaces";
import { getSocket } from "../../socket";

type Ack = (r: { status: "ok" | "error"; error?: string }) => void;

export function useOrdersCommands(userId: string, cmd: TOrderCommandUnion): Promise<void> {
    const socket = getSocket(userId);
    const message = { ...cmd } as TOrderCommandUnion;
    return new Promise<void>((resolve, reject) => {
        socket.emit("order_command", message, (ack: Parameters<Ack>[0]) => {
            if (ack?.status === "ok") return resolve();
            return reject(new Error(ack?.error || "command failed"));
        });
    });
}