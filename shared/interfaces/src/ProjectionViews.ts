export interface IShopView {
    orderId: string;
    userId: string;
    status: 'CREATED' | 'SHIPPED' | 'CANCELED';
    correlationId: string;
    total?: number;
    shippedAt?: string;
    carrier?: string;
    trackingNumber?: string;
}