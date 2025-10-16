import { Repository } from './Repository';
import { Order } from './OrderAggregate';
import { CreateOrder, ShipOrder } from '../commands';
import { IBroker, TOrderEventUnion } from '@daveloper/interfaces';
import { trace } from '@daveloper/opentelemetry';

export class CommandHandler {
  constructor(
    private repo: Repository<Order>,
    private broker: IBroker
  ) { }

  async handle(cmd: CreateOrder | ShipOrder) {
    trace.getActiveSpan()?.setAttribute('messaging.message.conversation_id', cmd.correlationId);

    const order = await this.repo.load(
      cmd.type === 'CreateOrder'
        ? (cmd as CreateOrder).payload.userId
        : (cmd as ShipOrder).payload.orderId,
      () => new Order(),
    );

    switch (cmd.type) {
      case 'CreateOrder':
        order.createOrder(cmd.payload, cmd.correlationId);
        break;
      case 'ShipOrder':
        order.shipOrder(cmd.payload, cmd.correlationId);
        break;
      default:
        throw new Error('Unknown command type');
    }

    await this.repo.save(order);

    const toPublish = order.uncommittedEvents as TOrderEventUnion[];
    for (const evt of toPublish) {
      try {
        await this.broker.publish(evt);
        console.log('📤 [order-handler] publish event', evt.type);
        order.clearEvents();
      } catch (err: any) {
        console.error('❌ [order-handler] failed to publish event', (evt as any).type, err);
        // TODO: implement retry and/or dead letter queue
      }
    }
    
  }
}
