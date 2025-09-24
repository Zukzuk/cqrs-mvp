import { AggregateRoot } from './AggregateRoot';
import { CreateOrder } from '../commands';
import { OrderCreated } from '../events';

export class Order extends AggregateRoot {
  public id!: string;
  public userId!: string;
  public total!: number;

  // ------------- Commands -------------

  createOrder(payload: CreateOrder["payload"], correlationId: string) {
    this.apply(new OrderCreated({
      ...payload
    }, correlationId));
  }

  // ---------- Event appliers ----------

  private onOrderCreated(e: OrderCreated & { type: 'OrderCreated' }) {
    this.id = e.payload.orderId;
    this.userId = e.payload.userId;
    this.total = e.payload.total;
  }
}
