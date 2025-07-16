import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { RabbitMQBroker } from '@daveloper/broker';
import { registerWebClient } from './webClient';
import { registerShopProjection } from './shopProjection';

(async () => {
  const app = express();
  app.use(cors({ origin: 'http://localhost:3001', credentials: true }));
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: 'http://localhost:3001', credentials: true },
    transports: ['polling', 'websocket']
  });
  
  const broker = new RabbitMQBroker(process.env.BROKER_URL!);
  await broker.init();
  console.log('🟢 [bff-broker] initialized');

  const shopProjectionNs = io.of('/shop_projection');
  registerShopProjection(shopProjectionNs, io);
  registerWebClient(io, broker, shopProjectionNs);

  server.listen(3000, () =>
    console.log('🚀 [http+wss+pubsub] BFF listening on port 3000')
  )
})()
