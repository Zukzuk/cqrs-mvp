import { AggregateRoot } from './aggregateRoot';
import { OrderCreated } from './events';
export class Order extends AggregateRoot {
  public id!: string;
  public total!: number;
  create(orderId: string, total: number) {
    console.log("create", orderId, total)
    if (total <= 0) throw new Error('Total must be positive');
    this.apply(new OrderCreated({ orderId, total }));
  }
  private onOrderCreated(e: OrderCreated) {
    console.log("onOrderCreated", e.payload);
    this.id = e.payload.orderId; this.total = e.payload.total;
  }
}