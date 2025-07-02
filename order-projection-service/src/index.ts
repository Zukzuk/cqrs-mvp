import express from 'express';
import cors from 'cors';
import { io as Client } from 'socket.io-client';
import { RabbitMQEventBus, IDomainEvent } from '@daveloper/eventbus';

interface OrderView { orderId: string; total: number; }

(async () => {
  // 1) Connect to BFF WebSocket namespace
  const socket = Client('http://shop-bff-service:4000/projection');

  // 2) Set up AMQP + in-memory store
  const bus = new RabbitMQEventBus(process.env.RABBITMQ_URL!);
  await bus.init();

  const store = new Map<string, OrderView>();

  // 3) Subscribe to domain events
  await bus.subscribe(async (evt: IDomainEvent) => {
    const { type, payload } = evt;
    if (!payload?.orderId) return;

    // 3a) Commit to store
    let view: OrderView | undefined = store.get(payload.orderId);
    if (type === 'OrderCreated') {
      view = { orderId: payload.orderId, total: payload.total };
    } else if (view && type === 'OrderUpdated') {
      view.total = payload.total;
    } else {
      return;
    }
    store.set(payload.orderId, view);

    // 3b) Emit snapshot on first ever, then update
    socket.emit('snapshot', view);
    socket.emit('update', view);
  }, {
    queue: 'order-projection-q',
    durable: true,
    autoDelete: false
  });

  // (Optional) you can still expose an HTTP snapshot endpoint if you like
  const app = express().use(cors());
  app.get('/orders/:id', (req, res) => {
    const view = store.get(req.params.id);
    return view ? res.json(view) : res.status(404).end();
  });
  app.listen(5000, () => console.log('Projection HTTP on 5000'));
})();
