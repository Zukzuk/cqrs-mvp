import express from 'express';
import http from 'http';
import { RabbitMQBroker } from '@daveloper/broker';
import { HttpEventStore } from '@daveloper/eventstore';
import { TCalendarCommandUnion, TCalendarEventUnion } from '@daveloper/interfaces';
import { Calendar } from './aggregate/CalendarAggregate';
import { BaseRepository } from '@daveloper/cqrs';
import { Dispatcher } from './handlers/Dispatcher';
import { startMetricsServer } from '@daveloper/opentelemetry';

async function main() {
  // expose Prometheus /metrics for this container
  startMetricsServer(Number(process.env.OTEL_METRICS_PORT) || 9100);

  // setup broker, event store, repository, dispatcher
  const broker = new RabbitMQBroker(process.env.BROKER_URL!);
  await broker.init();
  const eventStore = new HttpEventStore(process.env.EVENTSTORE_URL!);
  const repo = new BaseRepository<Calendar, TCalendarEventUnion>(eventStore);
  const dispatcher = new Dispatcher(repo, broker);

  // consume commands
  await broker.consumeQueue('commands.calendars', async (cmd: TCalendarCommandUnion) => {
    console.log('📨 [calendar-broker] recieving command', cmd.type);
    try {
      await dispatcher.dispatch(cmd);
    } catch (err) {
      console.error('❌ [calendar-handler] command handling failed:', err);
      throw err;
    }
  });

  // start express app (health checks, etc)
  const app = express();
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  const server = http.createServer(app);
  server.listen(Number(process.env.PORT) || 4010, () =>
    console.log('🚀 CalendarApplicationService up'),
  );
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
