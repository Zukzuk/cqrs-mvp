import express from 'express';
import cors from 'cors';
import { io as Client } from 'socket.io-client';
import { RabbitMQEventBus, IDomainEvent } from '@daveloper/eventbus';

interface OrderView { orderId: string; total: number; userId: string; }

(async () => {
  const store = new Map<string, OrderView>();

  const socket = Client('http://localhost:4000/order_projection', { transports: ['websocket'] });
  socket.on('connect', () => console.log('🔗 Connected to BFF /order_projection'));

  const bus = new RabbitMQEventBus(process.env.RABBITMQ_URL!);
  await bus.init

  await bus.subscribe(async (evt: IDomainEvent) => {
    const { type, payload } = evt;
    if (!payload?.orderId || !payload?.userId) return;

    let view = store.get(payload.userId);

    if (type === 'OrderCreated') {
      view = { orderId: payload.orderId, total: payload.total, userId: payload.userId };
      store.set(payload.userId, view);
    } else {
      return;
    }

    socket.emit('order_update', view);
  }, {
    queue: 'order-projection-q',
    durable: true,
    autoDelete: false
  });

  const app = express();
  app.use(cors());
  app.listen(5000, () => console.log('Projection HTTP on 5000'));
})();