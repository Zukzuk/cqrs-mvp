import express from 'express';
import http from 'http';
import { io as Client, Socket } from 'socket.io-client';
import { RabbitMQEventBus, IDomainEvent } from '@daveloper/eventbus';

(async () => {
  const store = new Map<string, any[]>();

  const socket: Socket = Client(
    'http://shop-bff-service:4000/order_projection',
    {
      transports: ['websocket'],
      auth: { serviceToken: 'dummy-projection' }  // ← dummy service token
    }
  );

  // Connection lifecycle
  socket.on('connect', () => console.log(`🔗 [projection-socket] Connected to bff as ${socket.id}`));
  socket.on('connect_error', err => console.error('❌ [projection-socket] Connect error:', err.message));
  socket.on('disconnect', reason => console.warn('⚠️ [projection-socket] Disconnected:', reason));

  // Log all incoming messages
  socket.onAny((event, payload) => {
    // console.log(`⬅️ [projection-socket] Received "${event}"`, payload);
  });

  const bus = new RabbitMQEventBus(process.env.RABBITMQ_URL!);
  await bus.init();
  console.log('🟢 [projection-bus] initialized');

  await bus.subscribe(async (evt: IDomainEvent) => {
    console.log('📨 [projection-bus] event', evt.type, evt.payload);
    const { orderId, userId, total } = evt.payload;
    
    if (!orderId || !userId) return;
    const arr = store.get(userId) || [];

    if (evt.type === 'OrderCreated') {
      const view = { orderId, userId, total, status: 'CREATED', correlationId: evt.correlationId };
      arr.push(view);
      store.set(userId, arr);
      console.log(`💾 [projection-denorm] save data for user=${userId}`, view);

      console.log('➡️ [projection-socket] sending order_update');
      socket.emit('order_update', view);
    }
  }, {
    queue: 'order-projection-q',
    durable: true,
    autoDelete: false
  });

  socket.on('request_snapshot', ({ userId }) => {
    console.log('⬅️ [projection-socket] recieving request_snapshot for', userId);
    const orders = store.get(userId) || [];
    console.log('➡️ [projection-socket] sending orders_snapshot');
    socket.emit('orders_snapshot', { userId, orders });
  });

  const app = express();
  const server = http.createServer(app);
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  server.listen(5000, () => console.log('🚀 [http+pubsub] OrderProjectionService listening on port 5000'));
})();
