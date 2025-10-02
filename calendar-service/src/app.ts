import express from 'express';
import http from 'http';
import { RabbitMQBroker } from '@daveloper/broker';
import { HttpEventStore } from '@daveloper/eventstore';
import { startMetricsServer, trace } from '@daveloper/opentelemetry';
import { Repository } from './aggregate/Repository';
import { Calendar } from './aggregate/CalendarAggregate';
import { buildDispatcher } from './handlers/Dispatcher';
import { TCalendarCommandUnion } from '@daveloper/interfaces';
import {
  CreateCalendar,
  ScheduleTimeslot,
  RescheduleTimeslot,
  RemoveScheduledTimeslot,
  RemoveCalendar,
} from './commands';

(async () => {
  // start metrics server
  startMetricsServer(Number(process.env.OTEL_METRICS_PORT) || 9101);

  // setup broker, event store, repository, dispatcher
  const broker = new RabbitMQBroker(process.env.BROKER_URL!);
  await broker.init();
  const eventStore = new HttpEventStore(process.env.EVENTSTORE_URL!);
  const repo = new Repository<Calendar>(eventStore);
  const dispatcher = buildDispatcher(repo, broker);

  // consume commands
  await broker.consumeQueue<TCalendarCommandUnion>('commands.calendars', async (cmd: any) => {
    await trace.getTracer('calendar').startActiveSpan('Dispatch', async (span) => {
      try {
        // add attributes
        span.setAttribute('calendar.id', cmd?.payload?.calendarId ?? 'unknown');
        if (cmd?.payload?.timeslotId) span.setAttribute('timeslot.id', cmd.payload.timeslotId);
        span.setAttribute('messaging.message.conversation_id', cmd?.correlationId ?? 'unknown');

        // dispatch command
        switch (cmd?.type) {
          case 'CreateCalendar':
            await dispatcher.dispatch(new CreateCalendar(cmd.payload, cmd.correlationId)); break;
          case 'ScheduleTimeslot':
            await dispatcher.dispatch(new ScheduleTimeslot(cmd.payload, cmd.correlationId)); break;
          case 'RescheduleTimeslot':
            await dispatcher.dispatch(new RescheduleTimeslot(cmd.payload, cmd.correlationId)); break;
          case 'RemoveScheduledTimeslot':
            await dispatcher.dispatch(new RemoveScheduledTimeslot(cmd.payload, cmd.correlationId)); break;
          case 'RemoveCalendar':
            await dispatcher.dispatch(new RemoveCalendar(cmd.payload, cmd.correlationId)); break;
          default:
            throw new Error(`Unknown command type: ${cmd?.type as string}`);
        }

        console.log('✅ handled', cmd.type);
      } catch (err) {
        span.recordException(err as Error);
        console.error('❌ [calendar-handler] command handling failed:', cmd?.type, err);
      } finally {
        span.end();
      }
    });
  });

  // start express app (health checks, etc)
  const app = express();
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  const server = http.createServer(app);
  server.listen(Number(process.env.PORT) || 4010, () =>
    console.log('🚀 CalendarApplicationService up'),
  );
})();
