import express from 'express';
import http from 'http';
import { HttpEventStore } from '@daveloper/eventstore';
import { RabbitMQBroker } from '@daveloper/broker';
import { BaseRepository } from '@daveloper/cqrs';
import { startMetricsServer } from '@daveloper/opentelemetry';
import type { TOrderCommandUnion, TOrderEventUnion } from '@daveloper/interfaces';
import { Order } from './aggregate/OrderAggregate';
import { Dispatcher } from './handlers/Dispatcher';


async function main() {
  // expose Prometheus /metrics for this container
  startMetricsServer(Number(process.env.OTEL_METRICS_PORT) || 9100);

  // setup broker, event store, repository, dispatcher
  const broker = new RabbitMQBroker(process.env.BROKER_URL!);
  await broker.init();
  const eventStore = new HttpEventStore(process.env.EVENTSTORE_URL!);
  const repo = new BaseRepository<Order, TOrderEventUnion>(eventStore);
  const dispatcher = new Dispatcher(repo, broker);

  // consume commands
  await broker.consumeQueue('commands.orders', async (cmd: TOrderCommandUnion) => {
    console.log('📨 [order-broker] recieving command', cmd.type);
    try {
      await dispatcher.dispatch(cmd);
    } catch (err) {
      console.error('❌ [order-handler] command handling failed:', err);
      throw err;
    }
  });

  // start express app (health checks, etc)
  const app = express();
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  const server = http.createServer(app);
  server.listen(Number(process.env.PORT) || 4000, () =>
    console.log('🚀 OrderApplicationService up'),
  );
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});