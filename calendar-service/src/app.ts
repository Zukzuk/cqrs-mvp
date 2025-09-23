import express from 'express';
import http from 'http';
import { RabbitMQBroker } from '@daveloper/broker';
import { HttpEventStore } from '@daveloper/eventstore';
import { startMetricsServer } from '@daveloper/opentelemetry';
import { Repository } from './repository';
import { CommandHandler } from './commandHandler';
import { Calendar } from './aggregate/calendarAggregate';
import {
  CreateCalendar, ScheduleTimeslot, RemoveSchedule, RemoveCalendar
} from './commands';

(async () => {
  startMetricsServer(Number(process.env.OTEL_METRICS_PORT) || 9101);

  const broker = new RabbitMQBroker(process.env.BROKER_URL!);
  await broker.init();

  const eventStore = new HttpEventStore(process.env.EVENTSTORE_URL!);
  const repo = new Repository<Calendar>(eventStore);
  const handler = new CommandHandler(repo, broker);

  await broker.consumeQueue(
    'calendar.commands',
    async (cmd: any) => {
      try {
        switch (cmd?.type) {
          case 'CreateCalendar': return handler.handle(new CreateCalendar(cmd.payload, cmd.correlationId));
          case 'ScheduleTimeslot': return handler.handle(new ScheduleTimeslot(cmd.payload, cmd.correlationId));
          case 'RemoveSchedule': return handler.handle(new RemoveSchedule(cmd.payload, cmd.correlationId));
          case 'RemoveCalendar': return handler.handle(new RemoveCalendar(cmd.payload, cmd.correlationId));
          default:
            console.warn('Unknown command', cmd?.type);
        }
      } catch (err) {
        console.error('Command handling failed:', err);
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
