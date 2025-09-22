import { IOrderCreatedEvent } from '@daveloper/interfaces';
import { mapOrderCreated } from '@daveloper/denormalizers';
import { trace } from '@daveloper/opentelemetry';
import { OrderRepository } from './repository';
import { Socket } from 'socket.io-client';

export class OrderDenormalizer {
  constructor(
    private readonly repository: OrderRepository,
    private readonly socket: Socket
  ) { }

  async handle(evt: IOrderCreatedEvent): Promise<void> {
    trace.getActiveSpan()?.setAttribute(
      'messaging.message.conversation_id', 
      evt.correlationId
    );

    const { userId } = evt.payload;
    const view = mapOrderCreated(evt);

    if (!view) return;

    console.log(`💾 [projection-denorm] saving order for user=${userId}`, view);
    await this.repository.save(view);

    console.log('➡️ [projection-socket] sending order_update');
    this.socket.emit('order_update', view);
  }
}

