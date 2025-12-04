// app.ts
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { RabbitMQBroker } from '@daveloper/broker';
import { startMetricsServer } from '@daveloper/opentelemetry';
import { registerWebClient } from './register/webClient';
import { registerShopProjection } from './register/shopProjection';
import { SnapshotService } from './services/SnapshotService';

(async () => {
  // Initialize OpenTelemetry metrics server
  startMetricsServer(Number(process.env.OTEL_METRICS_PORT) || 9100);

  // Initialize Express app
  const app = express();
  app.use(cors({ origin: 'http://localhost:3001', credentials: true }));
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

  // Create HTTP server and Socket.IO server
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: 'http://localhost:3001', credentials: true },
    transports: ['polling', 'websocket'],
  });

  // Initialize RabbitMQ broker
  const broker = new RabbitMQBroker(process.env.BROKER_URL!);
  await broker.init();
  console.log('🟢 [bff-broker] initialized');

  // Setup Shop Projection namespace and snapshot service
  const projectionNs = io.of('/shop_projection');
  const snapshots = new SnapshotService(projectionNs, [
    { name: 'orders', request: (ns, userId) => ns.emit('request_orders_snapshot', { userId }) },
  ]);

  // Register projections and web client handlers
  registerShopProjection(projectionNs, io, snapshots);
  registerWebClient(io, broker, projectionNs, snapshots);

  // Start the server
  server.listen(3000, () => console.log('🚀 Shop BFF up'));
})();
