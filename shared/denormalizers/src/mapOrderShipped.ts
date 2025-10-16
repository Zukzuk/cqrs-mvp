import { IDomainEvent, IShopView } from "@daveloper/interfaces";

export function mapOrderShipped(evt: IDomainEvent): IShopView | null {
    const { orderId, userId, shippedAt, carrier, trackingNumber } = evt.payload;
    if (evt.type !== 'OrderShipped') return null;
    if (!evt.payload.orderId || !evt.payload.userId) return null;

    return {
        orderId,
        userId,
        status: 'SHIPPED',
        correlationId: evt.correlationId,
        shippedAt,
        carrier,
        trackingNumber,
    };
}
