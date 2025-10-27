import { BaseHandler, BaseRepository } from '@daveloper/cqrs';
import { IBroker, IRemoveScheduledTimeslotCommand } from '@daveloper/interfaces';
import { Calendar } from '../aggregate/CalendarAggregate';

export class RemoveScheduledTimeslotHandler extends BaseHandler<IRemoveScheduledTimeslotCommand, Calendar> {
    constructor(repo: BaseRepository<Calendar>, broker: IBroker) {
        super(repo, broker);
    }

    async handle(cmd: IRemoveScheduledTimeslotCommand) {
        // Business logic
        const id = String(cmd.payload.calendarId);
        const calendar = await this.repo.load(id, () => new Calendar());
        calendar.removeSchedule(id, cmd.payload.timeslotId, cmd.correlationId);
        // Persist and publish event
        await this.saveAndPublish(calendar);
    }
}
