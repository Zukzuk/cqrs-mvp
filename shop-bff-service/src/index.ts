import express from 'express';
import http from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import { RabbitMQEventBus } from '@daveloper/eventbus';

(async () => {
  const app = express();
  const server = http.createServer(app);
  const io = new IOServer(server, { cors: { origin: '*' } });
  const bus = new RabbitMQEventBus(process.env.RABBITMQ_URL!);
  await bus.init();

  // Handle WebClient connections
  io.on('connection', (socket: Socket) => {
    const { userId } = socket.handshake.query as { userId: string };
    console.log(`👤 WebClient connected: ${socket.id} (user=${userId})`);
    socket.join(userId);

    // Request initial snapshot via projection namespace
    projectionNs.emit('request_snapshot', { userId });

    // Commands from client
    socket.on('command', async (cmd: any) => {
      console.log('📨 Command from WebClient:', cmd);
      cmd.payload.userId = userId;
      await bus.send('commands', cmd);
    });

    socket.on('disconnect', () => {
      console.log(`❌ WebClient disconnected: ${socket.id}`);
    });
  });

  // Namespace for Projection Service to connect
  const projectionNs = io.of('/order_projection');
  projectionNs.on('connection', (socket: Socket) => {
    const { userId } = socket.handshake.query as { userId: string };
    console.log(`🔗 Projection Service connected:: ${socket.id} (user=${userId})`);

    // Receive snapshot from projection
    socket.on('snapshot', (view: any) => {
      const { orderId, total } = view;
      io.to(userId).emit('orders_snapshot', view);
    });

    // Receive update from projection
    socket.on('update', (view: any) => {
      const { orderId, total, userId } = view;
      io.to(userId).emit('order_update', view);
    });
  });

  const PORT = 4000;
  server.listen(PORT, () => console.log(`BFF listening on port ${PORT}`));
})();
