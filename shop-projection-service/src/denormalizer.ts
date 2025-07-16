import { IOrderCreatedEvent } from '@daveloper/interfaces';
import { mapOrderCreated } from '@daveloper/denormalizers';
import { OrderRepository } from './repository';
import { Socket } from 'socket.io-client';

export class OrderDenormalizer {
  constructor(
    private readonly repository: OrderRepository,
    private readonly socket: Socket
  ) { }

  async handle(evt: IOrderCreatedEvent): Promise<void> {
    const { userId } = evt.payload;
    const view = mapOrderCreated(evt);

    if (!view) return;

    console.log(`💾 [projection-denorm] saving order for user=${userId}`, view);
    await this.repository.save(view);

    console.log('➡️ [projection-socket] sending order_update');
    this.socket.emit('order_update', view);
  }
}

