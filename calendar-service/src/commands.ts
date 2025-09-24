import {
  ICreateCalendarCommand,
  IRemoveCalendarCommand,
  IRemoveScheduledTimeslotCommand,
  IScheduleTimeslotCommand,
  IRescheduleTimeslotCommand,
} from '@daveloper/interfaces';

export class CreateCalendar implements ICreateCalendarCommand {
  readonly type = 'CreateCalendar' as const;
  constructor(
    public payload: ICreateCalendarCommand["payload"],
    public correlationId: string,
  ) { }
}

export class ScheduleTimeslot implements IScheduleTimeslotCommand {
  readonly type = 'ScheduleTimeslot' as const;
  constructor(
    public payload: IScheduleTimeslotCommand["payload"],
    public correlationId: string
  ) { }
}

export class RescheduleTimeslot implements IRescheduleTimeslotCommand {
  readonly type = 'RescheduleTimeslot' as const;
  constructor(
    public payload: IRescheduleTimeslotCommand["payload"], 
    public correlationId: string
  ) { }
}

export class RemoveScheduledTimeslot implements IRemoveScheduledTimeslotCommand {
  readonly type = 'RemoveScheduledTimeslot' as const;
  constructor(
    public payload: IRemoveScheduledTimeslotCommand["payload"],
    public correlationId: string
  ) { }
}

export class RemoveCalendar implements IRemoveCalendarCommand {
  readonly type = 'RemoveCalendar' as const;
  constructor(
    public payload: IRemoveCalendarCommand["payload"],
    public correlationId: string
  ) { }
}