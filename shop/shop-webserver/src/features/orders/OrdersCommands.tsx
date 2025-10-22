import type { ICreateOrderCommand, IShipOrderCommand } from "@daveloper/interfaces";

export const OrdersCommands = {
    createOrder(payload: { orderId: string; userId: string; total: number }): ICreateOrderCommand {
        return { type: "CreateOrder", payload } as any;
    },
    shipOrder(payload: { orderId: string; shippedAt?: string; carrier: string; trackingNumber: string }): IShipOrderCommand {
        return { type: "ShipOrder", payload } as any;
    },
};