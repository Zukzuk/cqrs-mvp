import { IDomainEvent, TOrderEventUnion } from '@daveloper/interfaces';
import { trace } from '@daveloper/opentelemetry';
import { projectOrderEvent } from '@daveloper/projections';
import { Socket } from 'socket.io-client';
import { OrderRepository } from './repository';

export class OrderHandler {
  constructor(
    private readonly repository: OrderRepository,
    private readonly socket: Socket
  ) { }

  async handle(evt: TOrderEventUnion): Promise<void> {
    trace.getActiveSpan()?.setAttribute(
      'messaging.message.conversation_id',
      evt.correlationId
    );

    const projection = projectOrderEvent(evt as IDomainEvent);
    if (!projection) return;

    console.log(`💾 [projection-denorm] saving order for user=${projection.userId}`, projection);
    await this.repository.save(projection);

    console.log('➡️ [projection-socket] sending order_update', projection);
    this.socket.emit('order_update', projection);
  }
}