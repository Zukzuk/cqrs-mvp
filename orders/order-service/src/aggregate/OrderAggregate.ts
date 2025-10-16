import { AggregateRoot } from './AggregateRoot';
import { CreateOrder, ShipOrder } from '../commands';
import { OrderCreated, OrderShipped } from '../events';

export class Order extends AggregateRoot {
  public id!: string;
  public userId!: string;
  public total!: number;
  public status!: 'CREATED' | 'SHIPPED';

  // ------------- Commands -------------

  createOrder(payload: CreateOrder["payload"], correlationId: string) {
    this.raise(new OrderCreated({ ...payload }, correlationId));
  }

  shipOrder(payload: ShipOrder["payload"], correlationId: string) {
    if (!this.id) throw new Error('Cannot ship: order not loaded');
    if (this.status !== 'CREATED') throw new Error(`Cannot ship: status=${this.status}`);
    this.raise(new OrderShipped({
      orderId: payload.orderId,
      userId: this.userId,
      shippedAt: payload.shippedAt ?? new Date().toISOString(),
      carrier: payload.carrier,
      trackingNumber: payload.trackingNumber,
    }, correlationId));
  }

  // ---------- Event appliers ----------

  private onOrderCreated(e: OrderCreated & { type: 'OrderCreated' }) {
    this.id = e.payload.orderId;
    this.userId = e.payload.userId;
    this.total = e.payload.total;
    this.status = 'CREATED';
  }

  private onOrderShipped(_e: OrderShipped & { type: 'OrderShipped' }) {
    this.status = 'SHIPPED';
  }
}
