import { IShopView, IDomainEvent } from '@daveloper/interfaces';

export function mapOrderCreated(evt: IDomainEvent): IShopView | null {
  if (evt.type !== 'OrderCreated') return null;
  
  const { orderId, userId, total } = evt.payload as {
    orderId: string;
    userId:   string;
    total:    number;
  };

  if (!orderId || !userId) return null;

  return {
    orderId,
    userId,
    total,
    status: 'CREATED',
    correlationId: evt.correlationId,
  };
}
