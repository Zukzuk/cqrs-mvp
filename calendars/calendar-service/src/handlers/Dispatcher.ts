import { TCalendarCommandUnion } from '@daveloper/interfaces';
import { BaseHandler } from './BaseHandler';
import { CreateCalendarHandler } from './CreateCalendarHandler';
import { ScheduleTimeslotHandler } from './ScheduleTimeslotHandler';
import { RemoveScheduledTimeslotHandler } from './RemoveScheduledTimeslotHandler';
import { RemoveCalendarHandler } from './RemoveCalendarHandler';
import { RescheduleTimeslotHandler } from './RescheduleTimeslotHandler';

type HandlerMap = {
    // map command type to handler
    [K in TCalendarCommandUnion['type']]: BaseHandler<Extract<TCalendarCommandUnion, { type: K }>>;
};

export class Dispatcher {
    constructor(private handlers: HandlerMap) { }

    async dispatch(cmd: TCalendarCommandUnion) {
        // find handler
        const handler = this.handlers[cmd.type];
        if (!handler) throw new Error(`Unknown command type: ${cmd.type as string}`);
        // dispatch
        await handler.handle(cmd as never);
    }
}

// factory
import { Repository } from '../aggregate/Repository';
import { Calendar } from '../aggregate/CalendarAggregate';
import { IBroker } from '@daveloper/interfaces';

export function buildDispatcher(repo: Repository<Calendar>, broker: IBroker) {
    return new Dispatcher({
        CreateCalendar: new CreateCalendarHandler(repo, broker),
        ScheduleTimeslot: new ScheduleTimeslotHandler(repo, broker),
        RescheduleTimeslot: new RescheduleTimeslotHandler(repo, broker),
        RemoveScheduledTimeslot: new RemoveScheduledTimeslotHandler(repo, broker),
        RemoveCalendar: new RemoveCalendarHandler(repo, broker),
    } as HandlerMap);
}
