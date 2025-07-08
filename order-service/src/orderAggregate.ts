import { AggregateRoot } from './aggregateRoot';
import { CreateOrder } from './commands';
import { OrderCreated } from './events';

export class Order extends AggregateRoot {
  public id!: string;
  public userId!: string;
  public total!: number;

  create(cmd: CreateOrder) {
    this.apply({ type: 'OrderCreated', payload: { ...cmd.payload }, correlationId: cmd.correlationId });
  }

  private onOrderCreated(e: OrderCreated) {
    this.id = e.payload.orderId;
    this.userId = e.payload.userId;
    this.total = e.payload.total;
  }
}
