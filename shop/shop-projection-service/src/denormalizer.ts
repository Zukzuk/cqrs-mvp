import { TOrderEventUnion } from '@daveloper/interfaces';
import { mapOrderCreated, mapOrderShipped} from '@daveloper/denormalizers';
import { trace } from '@daveloper/opentelemetry';
import { OrderRepository } from './repository';
import { Socket } from 'socket.io-client';

export class OrderDenormalizer {
  constructor(
    private readonly repository: OrderRepository,
    private readonly socket: Socket
  ) { }

  async handle(evt: TOrderEventUnion): Promise<void> {
    trace.getActiveSpan()?.setAttribute(
      'messaging.message.conversation_id', 
      evt.correlationId
    );

    let view;
    if (evt.type === 'OrderCreated') {
      view = mapOrderCreated(evt);
    } else if (evt.type === 'OrderShipped') {
      view = mapOrderShipped(evt);
    }

    if (!view) return;

    console.log(`💾 [projection-denorm] saving order for user=${view.userId}`, view);
    await this.repository.save(view);

    console.log('➡️ [projection-socket] sending order_update');
    this.socket.emit('order_update', view);
  }
}

