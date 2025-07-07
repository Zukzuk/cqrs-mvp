import express from 'express';
import http from 'http';
import { RabbitMQEventBus } from '@daveloper/eventbus';
import { InMemoryRepository } from './repository';
import { CommandHandler } from './commandHandler';
import { CreateOrder } from './commands';
import { Order } from './orderAggregate';

(async () => {
  const bus = new RabbitMQEventBus(process.env.RABBITMQ_URL!);
  await bus.init();

  const repo = new InMemoryRepository<Order>();
  const handler = new CommandHandler(repo, bus);

  // Drain the commands queue
  await bus.consumeQueue<CreateOrder>(
    'commands',
    async (cmd) => {
      // cmd is just the raw { type, payload } that matches the interface
      await handler.handle(cmd);
    }
  );

  const app = express();
  const server = http.createServer(app);
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  server.listen(6000, () => console.log('🚀 [http+pubsub] Order Application Service listening on port 6000'));
})();
