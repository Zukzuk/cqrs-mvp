import express from 'express';
import http from 'http';
import { RabbitMQBroker } from '@daveloper/broker';
import { HttpEventStore } from '@daveloper/eventstore';
import { startMetricsServer } from '@daveloper/opentelemetry';
import { Repository } from './repository';
import { CommandHandler } from './commandHandler';
import { CreateOrder } from './commands';
import { Order } from './orderAggregate';

(async () => {
  // expose Prometheus /metrics for this container
  startMetricsServer(Number(process.env.OTEL_METRICS_PORT) || 9100);

  // Broker connection
  const broker = new RabbitMQBroker(process.env.BROKER_URL!);
  await broker.init();
  console.log('🟢 [order-broker] initialized');

  // EventStore connection
  const eventStore = new HttpEventStore(process.env.EVENTSTORE_URL!);
  const repo = new Repository<Order>(eventStore);
  const handler = new CommandHandler(repo, broker);

  /*
   * Commands go point-to-point: send() directly into the commands queue 
   * and consumeQueue() asserts and reads that same queue. There’s exactly one queue, one handler.
   */
  await broker.consumeQueue<CreateOrder>(
    'commands',
    async (cmd: CreateOrder) => {
      console.log('📨 [order-broker] recieving command', cmd.type);
      try {
        await handler.handle(cmd);
        console.log('✅ [order-handler] command successfully handled', cmd.type);
      } catch (err: any) {
        console.error('❌ [order-handler] command handling failed:', err);
      }
    }
  );

  // HTTP server (for health checks, metrics, etc)
  const app = express();
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Start server
  const server = http.createServer(app);
  const port = Number(process.env.PORT) || 4000;
  server.listen(port, () => {
    console.log(`🚀 [http+pubsub] OrderApplicationService listening on port ${port}`);
  });
})();
