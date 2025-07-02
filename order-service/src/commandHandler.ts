import { CreateOrderCommand } from './commands';
import { InMemoryRepository } from './repository';
import { Order } from './orderAggregate';
import { IEventBus } from '@daveloper/eventbus';

export class CreateOrderHandler {
  constructor(
    private repo: InMemoryRepository<Order>,
    private bus: IEventBus
  ) {}

  async handle(cmd: CreateOrderCommand) {
    console.log('handle', JSON.stringify(cmd.payload));

    // 1) apply business logic
    const order = new Order();
    order.create(cmd.payload.orderId, cmd.payload.total);

    // 2) persist
    await this.repo.save(order);

    // 3) publish events via the IEventBus abstraction
    console.log('uncommittedEvents', order.uncommittedEvents);
    for (const event of order.uncommittedEvents) {
      await this.bus.publish(event);
    }

    // 4) clear
    order.clearEvents();
  }
}