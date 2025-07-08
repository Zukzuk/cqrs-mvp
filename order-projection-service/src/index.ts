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
  // socket.on('connect', () => console.log(`🟢 [socket] Connected as ${socket.id}`));
  // socket.on('connect_error', err => console.error('❌ [socket] Connect error:', err.message));
  // socket.on('disconnect', reason => console.warn('⚠️ [socket] Disconnected:', reason));

  // Log all incoming messages
  socket.onAny((event, payload) => {
    // console.log(`⬅️ [socket] Received "${event}"`, payload);
  });

  // 2) Initialize the bus _correctly_
  const bus = new RabbitMQEventBus(process.env.RABBITMQ_URL!);
  await bus.init();
  console.log('✅ [bus] RabbitMQEventBus initialized');

  await bus.subscribe(async (evt: IDomainEvent) => {
    console.log('📨 [bus] event', evt.type, evt.payload);
    const { orderId, userId, total } = evt.payload;
    
    if (!orderId || !userId) return;
    const arr = store.get(userId) || [];

    if (evt.type === 'OrderCreated') {
      const view = { orderId, userId, total, status: 'CREATED' };
      arr.push(view);
      store.set(userId, arr);
      // console.log(`🗄️ [store] user=${userId}`, arr);

      console.log('➡️ [socket] emitting order_update', view);
      socket.emit('order_update', view);
    }
  }, {
    queue: 'order-projection-q',
    durable: true,
    autoDelete: false
  });

  socket.on('request_snapshot', ({ userId }) => {
    console.log('⬅️ [socket] request_snapshot for', userId);
    const orders = store.get(userId) || [];
    console.log('➡️ [socket] emitting orders_snapshot', { userId, orders });
    socket.emit('orders_snapshot', { userId, orders });
  });

  const app = express();
  const server = http.createServer(app);
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  server.listen(5000, () => console.log('🚀 [http+pubsub] Order Projection Service listening on port 5000'));
})();
