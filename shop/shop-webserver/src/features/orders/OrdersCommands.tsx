import type { ICreateOrderCommand, IShipOrderCommand } from "@daveloper/interfaces";

export const OrdersCommands = {
    createOrder(input: { orderId: string; userId: string; total: number }): ICreateOrderCommand {
        return { type: "CreateOrder", payload: input } as any;
    },
    shipOrder(input: { orderId: string; shippedAt?: string; carrier: string; trackingNumber: string }): IShipOrderCommand {
        return { type: "ShipOrder", payload: input } as any;
    },
};