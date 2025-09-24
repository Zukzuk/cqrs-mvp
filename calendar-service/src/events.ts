import { 
  ICalendarCreatedEvent, 
  ICalendarRemovedEvent, 
  IScheduledTimeslotRemovedEvent, 
  ITimeslotScheduledEvent,
} from "@daveloper/interfaces";

export class CalendarCreated implements ICalendarCreatedEvent {
  readonly type = 'CalendarCreated' as const;
  constructor(
    public payload: ICalendarCreatedEvent["payload"],
    public correlationId: string
  ) {}
}

export class TimeslotScheduled implements ITimeslotScheduledEvent {
  readonly type = 'TimeslotScheduled' as const;
  constructor(
    public payload: ITimeslotScheduledEvent["payload"],
    public correlationId: string
  ) {}
}

export class ScheduledTimeslotRemoved implements IScheduledTimeslotRemovedEvent {
  readonly type = 'ScheduledTimeslotRemoved' as const;
  constructor(
    public payload: IScheduledTimeslotRemovedEvent["payload"],
    public correlationId: string
  ) {}
}

export class CalendarRemoved implements ICalendarRemovedEvent {
  readonly type = 'CalendarRemoved' as const;
  constructor(
    public payload: ICalendarRemovedEvent["payload"],
    public correlationId: string
  ) {}
}