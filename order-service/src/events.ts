export interface DomainEvent { type: string; payload: any; correlationId: string; }

export class OrderCreated implements DomainEvent {
  readonly type = 'OrderCreated';
  constructor(
    public payload: { orderId: string; userId: string, total: number },
    public correlationId: string,
  ) { }
}

export type AnyEvent = OrderCreated;