export interface IDomainEvent<P = any> {
  readonly type: string;
  readonly payload: P;
  readonly correlationId: string;
}

interface IOrderCreatedPayload {
  orderId: string;
  userId: string;
  total: number;
}

export interface IOrderCreatedEvent extends IDomainEvent<IOrderCreatedPayload>{
  readonly type: 'OrderCreated';
}

export type TDomainEventUnion = IOrderCreatedEvent // | IOtherEvent | … 
export type TAllDomainEventTypes = TDomainEventUnion['type'];
