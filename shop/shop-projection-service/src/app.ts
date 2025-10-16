import express from 'express';
import http from 'http';
import { MongoClient } from 'mongodb';
import { io as Client } from 'socket.io-client';
import { RabbitMQBroker } from '@daveloper/broker';
import { IShopView, TOrderEventUnion } from '@daveloper/interfaces';
import { startMetricsServer } from '@daveloper/opentelemetry';
import { OrderRepository } from './repository';
import { OrderDenormalizer } from './denormalizer';

(async () => {
  // expose Prometheus /metrics for this container
  startMetricsServer(Number(process.env.OTEL_METRICS_PORT) || 9100);

  // MongoDB connection
  const mongoClient = new MongoClient(process.env.MONGO_URL!);
  await mongoClient.connect();
  const db = mongoClient.db('shop_projection');
  const collection = db.collection<IShopView>('orders');
  const repository = new OrderRepository(collection);

  const socket = Client('http://shop-bff-service:3000/shop_projection', {
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

  const broker = new RabbitMQBroker(process.env.BROKER_URL!);
  await broker.init();
  console.log('🟢 [projection-broker] initialized');

  /*
   * Events go to a topic exchange (domain-events) with routing keys, 
   * and each consumer (projection, event-store, etc.) binds its own queue 
   * (often with ['#'] or a narrower set of keys) to get exactly the slice 
   * of the stream it needs.
   */
  await broker.subscribe<TOrderEventUnion>(
    async (evt) => {
      console.log('📨 [projection-broker] receiving event', evt.type);
      await denormalizer.handle(evt);
    },
    {
      queue: 'shop-projection-q', // Declare a queue
      exchange: 'domain-events', // Bind it to the "domain-events" exchange 
      routingKeys: ['OrderCreated', 'OrderShipped'], // Only use actual DomainEvent types
      durable: true, // Ensure the queue is durable
      autoDelete: false, // Do not auto-delete the queue when no consumers are connected
    }
  );
  console.log('🔗 [projection-broker] subscribed to domain-events');

  socket.on('request_snapshot', async ({ userId }) => {
    const orders = await repository.findByUserId(userId);
    console.log('➡️ [projection-socket] sending orders_snapshot');
    socket.emit('orders_snapshot', { userId, orders });
  });

  const app = express();
  const server = http.createServer(app);
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  server.listen(3002, () => console.log('🚀 ShopProjectionService Listening on port 3002'));
})();
