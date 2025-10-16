import { IShopView, IDomainEvent } from '@daveloper/interfaces';

export function mapOrderCreated(evt: IDomainEvent): IShopView | null {
  const { orderId, userId, total } = evt.payload;
  if (evt.type !== 'OrderCreated') return null;
  if (!orderId || !userId) return null;

  return {
    orderId,
    userId,
    status: 'CREATED',
    correlationId: evt.correlationId,
    total,
  };
}
