import { Repository } from './repository';
import { Calendar } from './aggregate/calendarAggregate';
import { IBroker } from '@daveloper/interfaces';
import { trace } from '@daveloper/opentelemetry';
import {
  CreateCalendar, ScheduleTimeslot, RemoveSchedule, RemoveCalendar
} from './commands';
import { CalendarCommand, CalendarEvent } from './types';

export class CommandHandler {
  constructor(private repo: Repository<Calendar>, private broker: IBroker) { }

  async handle(cmd: CalendarCommand) {
    trace.getActiveSpan()?.setAttribute('messaging.message.conversation_id', cmd.correlationId);

    const calendarId =
      cmd.type === 'CreateCalendar' ? cmd.payload.userId :
        cmd.type === 'ScheduleTimeslot' ? cmd.payload.calendarId :
          cmd.type === 'RemoveSchedule' ? cmd.payload.calendarId :
            cmd.type === 'RemoveCalendar' ? cmd.payload.calendarId :
              '';

    const calendar = await this.repo.load(calendarId, () => new Calendar());

    switch (cmd.type) {
      case 'CreateCalendar':
        calendar.createCalendar(cmd.payload.userId, cmd.correlationId);
        break;
      case 'ScheduleTimeslot':
        calendar.scheduleTimeslot(cmd.payload, cmd.correlationId);
        break;
      case 'RemoveSchedule':
        calendar.removeSchedule(cmd.payload.calendarId, cmd.payload.timeslotId, cmd.correlationId);
        break;
      case 'RemoveCalendar':
        calendar.removeCalendar(cmd.payload.calendarId, cmd.correlationId);
        break;
    }

    await this.repo.save(calendar);
    const events = calendar.uncommittedEvents as CalendarEvent[];

    // Publish all new events, then clear once
    for (const ev of events) {
      await this.broker.publish(ev);
      console.log('📤 [calendar-handler] published event', ev.type);
    }
    calendar.clearEvents();
  }
}
