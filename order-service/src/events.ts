import { IDomainEvent } from '@daveloper/domain';

export class OrderCreated implements IDomainEvent {
  readonly type = 'OrderCreated';
  constructor(
    public payload: { orderId: string; userId: string, total: number },
    public correlationId: string,
  ) { }
}