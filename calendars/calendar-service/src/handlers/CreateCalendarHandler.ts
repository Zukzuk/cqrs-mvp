import { BaseHandler, BaseRepository } from '@daveloper/cqrs';
import { IBroker, ICreateCalendarCommand, TCalendarEventUnion } from '@daveloper/interfaces';
import { Calendar } from '../aggregate/CalendarAggregate';

export class CreateCalendarHandler extends BaseHandler<ICreateCalendarCommand, Calendar, TCalendarEventUnion> {
    constructor(repo: BaseRepository<Calendar, TCalendarEventUnion>, broker: IBroker) {
        super(repo, broker);
    }

    async handle(cmd: ICreateCalendarCommand) {
        // Business logic
        const id = String(cmd.payload.calendarId);
        const calendar = await this.repo.load(id, () => new Calendar());
        calendar.createCalendar(cmd.payload.calendarId, cmd.correlationId);
        // Persist and publish event
        await this.saveAndPublish(calendar);
    }
}
