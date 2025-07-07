import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { RabbitMQEventBus } from '@daveloper/eventbus';

(async () => {
  const app = express();
  app.use(cors({ origin: 'http://localhost:3000', credentials: true }));

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: 'http://localhost:3000', credentials: true },
    transports: ['polling', 'websocket']
  });

  // --- DUMMY Auth for end-users ---
  io.use((socket: Socket, next) => {
    const { userId } = socket.handshake.auth as { userId?: string };
    if (!userId) {
      console.error('❌ [auth] Missing auth.userId');
      return next(new Error('auth error'));
    }
    socket.data.userId = userId;
    console.log(`✅ [auth] Accepted dummy userId=${userId}`);
    next();
  });

  const bus = new RabbitMQEventBus(process.env.RABBITMQ_URL!);
  await bus.init();
  console.log('✅ [bus] initialized');

  // — WebClient namespace
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    console.log(`👤 [socket] WebClient connected: socket=${socket.id}, user=${userId}`);
    socket.join(userId);

    console.log(`➡️ [socket] Requesting snapshot for user=${userId}`);
    projectionNs.emit('request_snapshot', { userId });

    socket.on('command', async (raw: any, ack) => {
      console.log('⬅️ [socket] command from client:', raw);
      raw.payload.userId = userId;
      try {
        await bus.send('commands', raw);
        console.log('✅ [bus] command sent');
        ack?.({ status: 'ok' });
      } catch (e: any) {
        console.error('❌ [bus] send failed', e);
        ack?.({ status: 'error', error: e.message });
      }
    });

    socket.on('disconnect', reason => {
      console.warn(`⚠️ [socket] WebClient disconnected: ${reason}`);
    });
  });

  // — Projection Service namespace
  const projectionNs = io.of('/order_projection');
  projectionNs.use((socket: Socket, next) => {
    const { serviceToken } = socket.handshake.auth as { serviceToken?: string };
    if (!serviceToken) {
      console.error('❌ [auth] Missing auth.serviceToken');
      return next(new Error('auth error'));
    }
    socket.data.serviceId = serviceToken;
    console.log(`✅ [auth] ProjectionService connected with dummy serviceId=${serviceToken}`);
    next();
  });

  projectionNs.on('connection', (socket: Socket) => {
    console.log(`🔗 [socket] ProjectionService connected: socket=${socket.id}, svc=${socket.data.serviceId}`);

    socket.on('orders_snapshot', (view: any) => {
      console.log('⬅️ [socket] orders_snapshot from projection:', view);
      io.to(view.userId).emit('orders_snapshot', view.orders);
      console.log(`➡️ [socket] Forwarded orders_snapshot → user=${view.userId}`);
    });

    socket.on('order_update', (order: any) => {
      console.log('⬅️ [socket] order_update from projection:', order);
      io.to(order.userId).emit('order_update', order);
      console.log(`➡️ [socket] Forwarded order_update → user=${order.userId}`);
    });

    socket.on('disconnect', reason => {
      console.warn(`⚠️ [socket] ProjectionService disconnected: ${reason}`);
    });
  });

  // Health-check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  
  server.listen(4000, () => console.log('🚀 [http+ws] BFF listening on port 4000'));
})();
