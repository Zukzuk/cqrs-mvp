import express from 'express';
import http from 'http';
import { RabbitMQBroker } from '@daveloper/broker';
import { InMemoryEventStore } from './eventStore/inMemoryEventStore';
import { InMemoryRepository } from './repository';
import { CommandHandler } from './commandHandler';
import { CreateOrder } from './commands';
import { Order } from './orderAggregate';

(async () => {
  const bus = new RabbitMQBroker(process.env.RABBITMQ_URL!);
  await bus.init();
  console.log('🟢 [order-bus] initialized');

  const eventStore = new InMemoryEventStore();
  const repo = new InMemoryRepository<Order>(eventStore);
  const handler = new CommandHandler(repo, bus);

  /*
   * Commands go point-to-point: send() directly into the commands queue 
   * and consumeQueue() asserts and reads that same queue. There’s exactly one queue, one handler.
   */
  await bus.consumeQueue<CreateOrder>(
    'commands',
    async (cmd: CreateOrder) => {
      console.log('📨 [order-bus] recieving command', cmd.type);
      try {
        await handler.handle(cmd);
        console.log('✅ [order-handler] command successfully handled', cmd.type);
      } catch (err: any) {
        console.error('❌ [order-handler] command handling failed:', err);
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
