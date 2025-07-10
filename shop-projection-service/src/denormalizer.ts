import { IDomainEvent } from '@daveloper/broker';
import { OrderRepository, OrderView } from './repository';
import { Socket } from 'socket.io-client';

export class OrderDenormalizer {
  constructor(
    private readonly repository: OrderRepository,
    private readonly socket: Socket
  ) { }

  async handle(evt: IDomainEvent): Promise<void> {
    const { orderId, userId, total } = evt.payload;
    if (!orderId || !userId) return;

    if (evt.type === 'OrderCreated') {
      const view: OrderView = {
        orderId,
        userId,
        total,
        status: 'CREATED',
        correlationId: evt.correlationId,
      };
      
      console.log(`💾 [projection-denorm] saving order for user=${userId}`, view);
      await this.repository.save(view);

      console.log('➡️ [projection-socket] sending order_update');
      this.socket.emit('order_update', view);
    }
  }
}
