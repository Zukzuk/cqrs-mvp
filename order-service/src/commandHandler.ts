import { CreateOrderCommand } from './commands';
import { InMemoryRepository } from './repository';
import { Order } from './orderAggregate';
import { EventBus } from './eventBus';
export class CreateOrderHandler {
  constructor(private repo: InMemoryRepository<Order>, private bus: EventBus) {}
  async handle(cmd: CreateOrderCommand) {
    console.log("handle", JSON.stringify(cmd.payload))
    const order = new Order();
    order.create(cmd.payload.orderId, cmd.payload.total);
    await this.repo.save(order);
    console.log("uncommittedEvents", order.uncommittedEvents)
    for (const e of order.uncommittedEvents) await this.bus.publish(e);
  }
}