import { BaseHandler, BaseRepository } from '@daveloper/cqrs';
import { IBroker, IRescheduleTimeslotCommand, TCalendarEventUnion } from '@daveloper/interfaces';
import { Calendar } from '../aggregate/CalendarAggregate';

export class RescheduleTimeslotHandler extends BaseHandler<IRescheduleTimeslotCommand, Calendar, TCalendarEventUnion> {
    constructor(repo: BaseRepository<Calendar, TCalendarEventUnion>, broker: IBroker) {
        super(repo, broker);
    }

    async handle(cmd: IRescheduleTimeslotCommand) {
        // Business logic
        const id = String(cmd.payload.calendarId);
        const calendar = await this.repo.load(id, () => new Calendar());
        calendar.rescheduleTimeslot(cmd.payload, cmd.correlationId);
        // Persist and publish event
        await this.saveAndPublish(calendar);
    }
}
