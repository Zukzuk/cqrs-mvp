export interface DomainEvent { type: string; payload: any; }

export class OrderCreated implements DomainEvent {
  readonly type = 'OrderCreated';
  constructor(public payload: { orderId: string; userId: string, total: number }) {}
}

export type AnyEvent = OrderCreated;