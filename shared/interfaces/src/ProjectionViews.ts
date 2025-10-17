import { TOrderStatus } from "./Types";

export interface IShopView {
    orderId: string;
    userId: string;
    status: TOrderStatus;
    correlationId: string;
    total?: number;
    shippedAt?: string;
    carrier?: string;
    trackingNumber?: string;
}