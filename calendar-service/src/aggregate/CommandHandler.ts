import { Repository } from './Repository';
import { Calendar } from './CalendarAggregate';
import { IBroker, TCalendarCommandUnion, TCalendarEventUnion } from '@daveloper/interfaces';
import { trace } from '@daveloper/opentelemetry';

export class CommandHandler {
  constructor(
    private repo: Repository<Calendar>,
    private broker: IBroker
  ) { }

  async handle(cmd: TCalendarCommandUnion) {
    trace.getActiveSpan()?.setAttribute(
      'messaging.message.conversation_id',
      cmd.correlationId
    );

    // Load existing or new aggregate
    const calendar = await this.repo.load(
      cmd.payload.calendarId,
      () => new Calendar()
    );

    // Handle command
    switch (cmd.type) {
      case 'CreateCalendar':
        calendar.createCalendar(cmd.payload.calendarId, cmd.correlationId);
        break;
      case 'ScheduleTimeslot':
        calendar.scheduleTimeslot(cmd.payload, cmd.correlationId);
        break;
      case 'RemoveScheduledTimeslot':
        calendar.removeSchedule(cmd.payload.calendarId, cmd.payload.timeslotId, cmd.correlationId);
        break;
      case 'RemoveCalendar':
        calendar.removeCalendar(cmd.payload.calendarId, cmd.correlationId);
        break;
      default:
        throw new Error(`Unknown command type: ${cmd}`);
    }

    // Save aggregate state
    await this.repo.save(calendar);
    console.log(`💾 [calendar-write] save data for user=${cmd.payload.calendarId}`, cmd.payload);

    // Publish all new events, then clear once
    for (const ev of calendar.uncommittedEvents as TCalendarEventUnion[]) {
      try {
        await this.broker.publish(ev);
        console.log('📤 [calendar-handler] published event', ev.type);
        calendar.clearEvents();
      } catch (err: any) {
        console.error('❌ [calendar-handler] failed to publish event', err.type, err);
        // TODO: do something smart here, try redo calendar.uncommittedEvents...?
      }
    }
  }
}
