import { CreateOrder } from './commands';
import { InMemoryRepository } from './repository';
import { Order } from './orderAggregate';
import { IEventBus } from '@daveloper/eventbus';

export class CommandHandler {
  constructor(
    private repo: InMemoryRepository<Order>,
    private bus: IEventBus
  ) { }

  async handle(cmd: CreateOrder) {
    const order = await this.repo.load(
      cmd.payload.userId,
      () => new Order()
    );

    if (cmd.type === 'CreateOrder') {
      order.create(cmd);
    }

    await this.repo.save(order);
    for (const e of order.uncommittedEvents) {
      await this.bus.publish(e);
    }
    order.clearEvents();
  }
}
