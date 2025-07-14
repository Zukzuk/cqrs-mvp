import { IOrderCreatedEvent } from '@daveloper/interfaces';

export class OrderCreated implements IOrderCreatedEvent {
  readonly type = 'OrderCreated';
  constructor(
    public payload: { orderId: string; userId: string, total: number },
    public correlationId: string,
  ) { }
}