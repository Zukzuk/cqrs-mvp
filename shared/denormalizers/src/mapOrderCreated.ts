import { ShopOrdersDocument, IDomainEvent, IOrderCreatedEvent } from '@daveloper/interfaces';

export function mapOrderCreated(evt: IDomainEvent<IOrderCreatedEvent['payload']>): ShopOrdersDocument | null {
  const { orderId, userId, total, status } = evt.payload;
  if (evt.type !== 'OrderCreated') return null;
  if (!orderId || !userId) return null;

  return {
    orderId,
    userId,
    status,
    correlationId: evt.correlationId,
    total,
  };
}
