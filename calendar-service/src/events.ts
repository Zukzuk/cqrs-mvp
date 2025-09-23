import {
  IDomainEvent,
  CalendarCreatedPayload, TimeslotScheduledPayload,
  ScheduleRemovedPayload, CalendarRemovedPayload
} from './types';

export class CalendarCreated implements IDomainEvent<'CalendarCreated', CalendarCreatedPayload> {
  readonly type = 'CalendarCreated' as const;
  constructor(public payload: CalendarCreatedPayload, public correlationId: string) { }
}
export class TimeslotScheduled implements IDomainEvent<'TimeslotScheduled', TimeslotScheduledPayload> {
  readonly type = 'TimeslotScheduled' as const;
  constructor(public payload: TimeslotScheduledPayload, public correlationId: string) { }
}
export class ScheduleRemoved implements IDomainEvent<'ScheduleRemoved', ScheduleRemovedPayload> {
  readonly type = 'ScheduleRemoved' as const;
  constructor(public payload: ScheduleRemovedPayload, public correlationId: string) { }
}
export class CalendarRemoved implements IDomainEvent<'CalendarRemoved', CalendarRemovedPayload> {
  readonly type = 'CalendarRemoved' as const;
  constructor(public payload: CalendarRemovedPayload, public correlationId: string) { }
}
