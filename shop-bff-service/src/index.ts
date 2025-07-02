import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as IOServer } from 'socket.io';
import { RabbitMQEventBus } from '@daveloper/eventbus';

(async () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // --- HTTP commands endpoint ---
  const bus = new RabbitMQEventBus(process.env.RABBITMQ_URL!);
  await bus.init();
  app.post('/commands', async (req, res) => {
    await bus.send('commands', req.body);
    res.sendStatus(202);
  });

  // --- Create HTTP + WS servers ---
  const server = http.createServer(app);
  const io = new IOServer(server, { cors: { origin: '*' } });

  // When a browser connects:
  io.on('connection', socket => {
    socket.on('subscribe', (orderId: string) => {
      socket.join(orderId);
      // nothing else—snapshot will come from projection service
    });
  });

  // Namespace for projection service to connect as a client
  const projNS = io.of('/projection');
  projNS.on('connection', socket => {
    // Projection service will emit 'snapshot' and 'update'
    socket.on('snapshot', (view) => {
      const { orderId } = view;
      io.to(orderId).emit('snapshot', view);
    });
    socket.on('update', (view) => {
      const { orderId } = view;
      io.to(orderId).emit('update', view);
    });
  });

  server.listen(4000, () => console.log('BFF WS on port 4000'));
})();
