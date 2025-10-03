import { Repository } from './Repository';
import { Order } from './OrderAggregate';
import { CreateOrder } from '../commands';
import { OrderCreated } from '../events';
import { IBroker, IOrderCreatedEvent } from '@daveloper/interfaces';
import { trace } from '@daveloper/opentelemetry';

export class CommandHandler {
  constructor(
    private repo: Repository<Order>,
    private broker: IBroker
  ) { }

  async handle(cmd: CreateOrder) {
    trace.getActiveSpan()?.setAttribute(
      'messaging.message.conversation_id',
      cmd.correlationId,
    );

    // Load existing or new aggregate
    const order = await this.repo.load(
      cmd.payload.userId,
      () => new Order(),
    );

    // Handle command
    switch (cmd.type) {
      case 'CreateOrder':
        order.createOrder(cmd.payload, cmd.correlationId);
        break;
      default:
        throw new Error(`Unknown command type: ${cmd}`);
    }

    // Save aggregate state
    await this.repo.save(order);
    console.log(`💾 [order-write] save data for user=${cmd.payload.userId}`, order);

    // Publish all new events, then clear once
    for (const ev of order.uncommittedEvents as IOrderCreatedEvent[]) {
      try {
        await this.broker.publish(ev);
        console.log('📤 [order-handler] publish event', ev.type);
        order.clearEvents();
      } catch (err: any) {
        console.error('❌ [order-handler] failed to publish event', err.type, err);
        // TODO: do something smart here, try redo order.uncommittedEvents...?
      }
    }
  }
}
