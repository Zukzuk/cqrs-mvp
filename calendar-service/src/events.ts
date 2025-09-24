import { 
  ICalendarCreatedEvent, 
  ICalendarRemovedEvent, 
  IScheduledTimeslotRemovedEvent, 
  ITimeslotScheduledEvent,
  ITimeslotRescheduledEvent,
  ICalendarCreationFailedEvent,
  ITimeslotSchedulingFailedEvent,
  ITimeslotReschedulingFailedEvent,
  IScheduledTimeslotRemovalFailedEvent,
  ICalendarRemovalFailedEvent,
} from "@daveloper/interfaces";

// Success Events

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

export class TimeslotRescheduled implements ITimeslotRescheduledEvent {
  readonly type = 'TimeslotRescheduled' as const;
  constructor(
    public payload: ITimeslotRescheduledEvent["payload"], 
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

// Failure Events

export class CalendarCreationFailed implements ICalendarCreationFailedEvent {
  readonly type = 'CalendarCreationFailed' as const;
  constructor(
    public payload: ICalendarCreationFailedEvent["payload"],
    public correlationId: string
  ) {}
}

export class TimeslotSchedulingFailed implements ITimeslotSchedulingFailedEvent {
  readonly type = 'TimeslotSchedulingFailed' as const;
  constructor(
    public payload: ITimeslotSchedulingFailedEvent["payload"],
    public correlationId: string
  ) {}
}

export class TimeslotReschedulingFailed implements ITimeslotReschedulingFailedEvent {
  readonly type = 'TimeslotReschedulingFailed' as const;
  constructor(
    public payload: ITimeslotReschedulingFailedEvent["payload"],
    public correlationId: string
  ) {}
}

export class ScheduledTimeslotRemovalFailed implements IScheduledTimeslotRemovalFailedEvent {
  readonly type = 'ScheduledTimeslotRemovalFailed' as const;
  constructor(
    public payload: IScheduledTimeslotRemovalFailedEvent["payload"],
    public correlationId: string
  ) {}
}

export class CalendarRemovalFailed implements ICalendarRemovalFailedEvent {
  readonly type = 'CalendarRemovalFailed' as const;
  constructor(
    public payload: ICalendarRemovalFailedEvent["payload"],
    public correlationId: string
  ) {}
}