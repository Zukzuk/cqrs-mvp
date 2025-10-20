import { IDomainEvent, IOrderShippedEvent, ShopOrdersDocument } from "@daveloper/interfaces";

export function mapOrderShipped(evt: IDomainEvent<IOrderShippedEvent['payload']>): ShopOrdersDocument | null {
    const { orderId, userId, shippedAt, carrier, trackingNumber, status } = evt.payload;
    if (evt.type !== 'OrderShipped') return null;
    if (!orderId || !userId) return null;

    return {
        orderId,
        userId,
        status,
        correlationId: evt.correlationId,
        shippedAt,
        carrier,
        trackingNumber,
    };
}
