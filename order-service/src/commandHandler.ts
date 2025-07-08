import { CreateOrder } from './commands';
import { InMemoryRepository } from './repository';
import { Order } from './orderAggregate';
import { IEventBus, IDomainEvent } from '@daveloper/eventbus';
import { OrderCreated } from './events';

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
    console.log(`💾 [order-write] save data for user=${cmd.payload.userId}`, order);

    for (const rawEvent of order.uncommittedEvents as IDomainEvent[]) {
      try {
        const ev = new OrderCreated(rawEvent.payload, cmd.correlationId); // stamp with the corrId
        await this.bus.publish(ev);
        console.log('✅ [order-handler] publish event', ev.type);
      } catch (err: any) {
        console.error('❌ [order-handler] failed to publish event', err.type, err);
      }
    }

    order.clearEvents();
  }
}
