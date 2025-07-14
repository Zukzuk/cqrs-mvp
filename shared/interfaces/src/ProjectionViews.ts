export interface IShopView {
    orderId: string;
    userId: string;
    total: number;
    status: 'CREATED' | 'COMPLETED' | 'CANCELED';
    correlationId: string;
}