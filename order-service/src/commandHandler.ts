import { CreateOrder } from './commands';
import { Repository } from './repository';
import { Order } from './orderAggregate';
import { IBroker } from '@daveloper/broker';
import { IOrderCreatedEvent } from '@daveloper/interfaces';
import { OrderCreated } from './events';

export class CommandHandler {
  constructor(
    private repo: Repository<Order>,
    private broker: IBroker
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

    for (const rawEvent of order.uncommittedEvents as IOrderCreatedEvent[]) {
      try {
        const ev = new OrderCreated(rawEvent.payload, cmd.correlationId); // stamp with the corrId
        await this.broker.publish(ev);
        console.log('📤 [order-handler] publish event', ev.type);
        order.clearEvents();
      } catch (err: any) {
        console.error('❌ [order-handler] failed to publish event', err.type, err);
        // TODO: do something smart with the failed event here...
      }
    }
  }
}
