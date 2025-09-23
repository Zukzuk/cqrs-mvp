import {
  ICommand,
  CreateCalendarPayload, ScheduleTimeslotPayload,
  RemoveSchedulePayload, RemoveCalendarPayload
} from './types';

export class CreateCalendar implements ICommand<'CreateCalendar', CreateCalendarPayload> {
  readonly type = 'CreateCalendar' as const;
  constructor(public payload: CreateCalendarPayload, public correlationId: string) { }
}
export class ScheduleTimeslot implements ICommand<'ScheduleTimeslot', ScheduleTimeslotPayload> {
  readonly type = 'ScheduleTimeslot' as const;
  constructor(public payload: ScheduleTimeslotPayload, public correlationId: string) { }
}
export class RemoveSchedule implements ICommand<'RemoveSchedule', RemoveSchedulePayload> {
  readonly type = 'RemoveSchedule' as const;
  constructor(public payload: RemoveSchedulePayload, public correlationId: string) { }
}
export class RemoveCalendar implements ICommand<'RemoveCalendar', RemoveCalendarPayload> {
  readonly type = 'RemoveCalendar' as const;
  constructor(public payload: RemoveCalendarPayload, public correlationId: string) { }
}
