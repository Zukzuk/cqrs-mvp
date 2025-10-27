import { BaseHandler, BaseRepository } from '@daveloper/cqrs';
import { IBroker, IScheduleTimeslotCommand } from '@daveloper/interfaces';
import { Calendar } from '../aggregate/CalendarAggregate';

export class ScheduleTimeslotHandler extends BaseHandler<IScheduleTimeslotCommand, Calendar> {
    constructor(repo: BaseRepository<Calendar>, broker: IBroker) {
        super(repo, broker);
    }

    async handle(cmd: IScheduleTimeslotCommand) {
        // Business logic
        const id = String(cmd.payload.calendarId);
        const calendar = await this.repo.load(id, () => new Calendar());
        calendar.scheduleTimeslot(cmd.payload, cmd.correlationId);
        // Persist and publish event
        await this.saveAndPublish(calendar);
    }
}

