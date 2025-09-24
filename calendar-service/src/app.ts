import express from 'express';
import http from 'http';
import { RabbitMQBroker } from '@daveloper/broker';
import { HttpEventStore } from '@daveloper/eventstore';
import { startMetricsServer } from '@daveloper/opentelemetry';
import { Repository } from './aggregate/Repository';
import { CommandHandler } from './aggregate/CommandHandler';
import { Calendar } from './aggregate/CalendarAggregate';
import {
  CreateCalendar, ScheduleTimeslot, RemoveScheduledTimeslot, RemoveCalendar
} from './commands';

(async () => {
  // expose Prometheus /metrics for this container
  startMetricsServer(Number(process.env.OTEL_METRICS_PORT) || 9101);

  // Broker connection
  const broker = new RabbitMQBroker(process.env.BROKER_URL!);
  await broker.init();

  // EventStore connection
  const eventStore = new HttpEventStore(process.env.EVENTSTORE_URL!);
  const repo = new Repository<Calendar>(eventStore);
  const handler = new CommandHandler(repo, broker);

  /*  
   * Commands go point-to-point: send() directly into the commands queue
   * and consumeQueue() asserts and reads that same queue. There’s exactly one queue, one handler.
   */
  await broker.consumeQueue(
    'commands',
    async (cmd: any) => {
      try {
        switch (cmd?.type) {
          case 'CreateCalendar': return handler.handle(new CreateCalendar(cmd.payload, cmd.correlationId));
          case 'ScheduleTimeslot': return handler.handle(new ScheduleTimeslot(cmd.payload, cmd.correlationId));
          case 'RemoveScheduledTimeslot': return handler.handle(new RemoveScheduledTimeslot(cmd.payload, cmd.correlationId));
          case 'RemoveCalendar': return handler.handle(new RemoveCalendar(cmd.payload, cmd.correlationId));
          default:
            throw new Error(`Unknown command type: ${cmd?.type}`);
        }
      } catch (err) {
        console.error('❌ [order-handler] command handling failed:', err);
      }
    }
  );

  const app = express();
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  const server = http.createServer(app);
  server.listen(Number(process.env.PORT) || 4100, () =>
    console.log('🚀 CalendarApplicationService up'),
  );
})();
