import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { RabbitMQBroker } from '@daveloper/broker';
import { startMetricsServer } from '@daveloper/opentelemetry';
import { registerWebClient } from './register/webClient';
import { registerShopProjection } from './register/shopProjection';

(async () => {
  // expose Prometheus /metrics for this container
  startMetricsServer(Number(process.env.OTEL_METRICS_PORT) || 9100);

  // HTTP + WebSocket server
  const app = express();
  app.use(cors({ origin: 'http://localhost:3001', credentials: true }));
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

  // Create HTTP server and bind Socket.IO to it
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: 'http://localhost:3001', credentials: true },
    transports: ['polling', 'websocket']
  });
  
  // Broker connection
  const broker = new RabbitMQBroker(process.env.BROKER_URL!);
  await broker.init();
  console.log('🟢 [bff-broker] initialized');

  // Register namespaces and their handlers
  const shopProjectionNs = io.of('/shop_projection');
  registerShopProjection(shopProjectionNs, io);
  registerWebClient(io, broker, shopProjectionNs);

  server.listen(3000, () =>
    console.log('🚀 Shop Backend for Frontend up')
  )
})()
