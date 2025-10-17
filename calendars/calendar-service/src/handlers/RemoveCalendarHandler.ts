import { IBroker, IRemoveCalendarCommand, TCalendarEventUnion } from '@daveloper/interfaces';
import { Calendar } from '../aggregate/CalendarAggregate';
import { BaseHandler, BaseRepository } from '@daveloper/cqrs';

export class RemoveCalendarHandler extends BaseHandler<IRemoveCalendarCommand, Calendar, TCalendarEventUnion> {
    constructor(repo: BaseRepository<Calendar, TCalendarEventUnion>, broker: IBroker) {
        super(repo, broker);
    }

    async handle(cmd: IRemoveCalendarCommand) {
        // Business logic
        const id = String(cmd.payload.calendarId);
        const calendar = await this.repo.load(id, () => new Calendar());
        calendar.removeCalendar(cmd.payload.calendarId, cmd.correlationId);
        // Persist and publish event
        await this.saveAndPublish(calendar);
    }
}
