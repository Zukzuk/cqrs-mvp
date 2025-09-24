import { Repository } from '../aggregate/Repository';
import { Calendar } from '../aggregate/CalendarAggregate';
import { IBroker, TCalendarEventUnion } from '@daveloper/interfaces';

export abstract class BaseHandler<TCmd extends { correlationId: string; payload: any }> {
    constructor(protected repo: Repository<Calendar>, protected broker: IBroker) { }

    protected async load(calendarId: string) {
        // load existing or create new
        return this.repo.load(calendarId, () => new Calendar());
    }

    protected async saveAndPublish(calendar: Calendar) {
        // save and publish events
        await this.repo.save(calendar);
        // publish all events
        const events = calendar.uncommittedEvents as TCalendarEventUnion[];
        for (const ev of events) {
            await this.broker.publish(ev);
        }
        // clear once, after all publishes
        calendar.clearEvents();
    }

    abstract handle(cmd: TCmd): Promise<void>;
}
