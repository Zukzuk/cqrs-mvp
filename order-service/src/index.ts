import express from 'express';
import http from 'http';
import { RabbitMQEventBus } from '@daveloper/eventbus';
import { InMemoryRepository } from './repository';
import { CommandHandler } from './commandHandler';
import { AnyCommand } from './commands';
import { Order } from './orderAggregate';

(async () => {
  const bus = new RabbitMQEventBus(process.env.RABBITMQ_URL!);
  await bus.init();
  console.log('🟢 [order-bus] initialized');

  const repo = new InMemoryRepository<Order>();
  const handler = new CommandHandler(repo, bus);

  await bus.consumeQueue<AnyCommand>(
    'commands',
    async (cmd) => {
      console.log('📨 [order-bus] Received command', cmd.type, cmd.payload);
      try {
        await handler.handle(cmd);
        console.log('✅ [order-handler] Command handled successfully:', cmd.type);
      } catch (err: any) {
        console.error('❌ [order-handler] Command handling failed:', err);
      }
    }
  );

  const app = express();
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  const server = http.createServer(app);
  const port = Number(process.env.PORT) || 6000;
  server.listen(port, () => {
    console.log(`🚀 [http+pubsub] OrderApplicationService listening on port ${port}`);
  });
})();
