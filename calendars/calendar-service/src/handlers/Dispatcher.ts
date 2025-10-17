import { IBroker, TCalendarCommandUnion, TCalendarEventUnion } from '@daveloper/interfaces';
import { BaseDispatcher, HandlerFor, BaseRepository } from '@daveloper/cqrs';
import { Calendar } from '../aggregate/CalendarAggregate';
import { CreateCalendarHandler } from './CreateCalendarHandler';
import { ScheduleTimeslotHandler } from './ScheduleTimeslotHandler';
import { RemoveScheduledTimeslotHandler } from './RemoveScheduledTimeslotHandler';
import { RemoveCalendarHandler } from './RemoveCalendarHandler';
import { RescheduleTimeslotHandler } from './RescheduleTimeslotHandler';

export class Dispatcher {
    private dispatcher: BaseDispatcher<TCalendarCommandUnion>;

    constructor(repo: BaseRepository<Calendar, TCalendarEventUnion>, broker: IBroker) {
        const handlers = {
            CreateCalendar: new CreateCalendarHandler(repo, broker),
            ScheduleTimeslot: new ScheduleTimeslotHandler(repo, broker),
            RescheduleTimeslot: new RescheduleTimeslotHandler(repo, broker),
            RemoveScheduledTimeslot: new RemoveScheduledTimeslotHandler(repo, broker),
            RemoveCalendar: new RemoveCalendarHandler(repo, broker),
        } satisfies { [K in TCalendarCommandUnion['type']]: HandlerFor<TCalendarCommandUnion, K> };

        this.dispatcher = new BaseDispatcher<TCalendarCommandUnion>(handlers);
    }

    async dispatch(cmd: TCalendarCommandUnion) {
        return this.dispatcher.dispatch(cmd);
    }
}
