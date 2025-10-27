import { IDomainEvent, IOrderCreatedEvent, IOrderShippedEvent, ShopOrdersDocument } from '@daveloper/interfaces';

function mapOrderCreated(evt: IDomainEvent): ShopOrdersDocument | null {
  const { 
    orderId, userId, total, status 
  } = evt.payload as IOrderCreatedEvent["payload"];

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

function mapOrderShipped(evt: IDomainEvent): ShopOrdersDocument | null {
    const { 
      orderId, userId, shippedAt, carrier, trackingNumber, status 
    } = evt.payload as IOrderShippedEvent["payload"];
    
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

export function projectOrderEvent(evt: IDomainEvent): ShopOrdersDocument | null {
  if (evt.type === 'OrderCreated') return mapOrderCreated(evt);
  if (evt.type === 'OrderShipped') return mapOrderShipped(evt);
  return null;
}
