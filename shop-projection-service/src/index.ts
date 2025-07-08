import express from 'express';
import http from 'http';
import { MongoClient } from 'mongodb';
import { io as Client } from 'socket.io-client';
import { RabbitMQEventBus, IDomainEvent } from '@daveloper/eventbus';

import { OrderRepository, OrderView } from './repository';
import { OrderDenormalizer } from './denormalizer';

(async () => {
  const mongoClient = new MongoClient(process.env.MONGO_URL!);
  await mongoClient.connect();
  const db = mongoClient.db('shop_projection');
  const collection = db.collection<OrderView>('orders');
  const repository = new OrderRepository(collection);

  const socket = Client('http://shop-bff-service:4000/shop_projection', {
    transports: ['websocket'],
    auth: { serviceId: 'service123' },
  });

  // Connection lifecycle
  // socket.on('connect', () => console.log(`🔗 [projection-socket] connecting to bff-socket=${socket.id} as serviceId=${auth.serviceId}`));
  socket.on('connect_error', err => console.error('❌ [projection-socket] Connect error:', err.message));
  socket.on('disconnect', reason => console.warn('⚠️ [projection-socket] Disconnected:', reason));

  // Log all incoming messages
  socket.onAny((event, payload) => {
    // console.log(`⬅️ [projection-socket] Received "${event}"`, payload);
  });

  const denormalizer = new OrderDenormalizer(repository, socket);

  const bus = new RabbitMQEventBus(process.env.RABBITMQ_URL!);
  await bus.init();
  console.log('🟢 [projection-bus] initialized');

  await bus.subscribe(
    async (evt: IDomainEvent) => {
      console.log('📨 [projection-bus] receiving event', evt.type);
      await denormalizer.handle(evt);
    },{
      queue: 'shop-projection-q',
      durable: true,
      autoDelete: false,
    }
  );

  socket.on('request_snapshot', async ({ userId }) => {
    const orders = await repository.findByUserId(userId);
    console.log('➡️ [projection-socket] sending orders_snapshot');
    socket.emit('orders_snapshot', { userId, orders });
  });

  const app = express();
  const server = http.createServer(app);
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  server.listen(5000, () => console.log('🚀 ShopProjectionService Listening on port 5000'));
})();
