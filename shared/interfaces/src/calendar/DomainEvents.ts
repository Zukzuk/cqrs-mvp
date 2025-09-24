import { IDomainEvent } from "../DomainEvents";
import { ViolationReason, ISODateTime } from "./Types";

// Success Events

export interface ICalendarCreatedEvent extends IDomainEvent<{
  calendarId: string;
}> { readonly type: 'CalendarCreated'; }

export interface ITimeslotScheduledEvent extends IDomainEvent<{
  calendarId: string
  timeslotId: string;
  title: string;
  start: ISODateTime;
  end: ISODateTime;
  location?: string;
  description?: string;
}> { readonly type: 'TimeslotScheduled'; }

export interface ITimeslotRescheduledEvent extends IDomainEvent<{
  calendarId: string;
  timeslotId: string;
  start: ISODateTime;
  end: ISODateTime;
}> { readonly type: 'TimeslotRescheduled'; }

export interface IScheduledTimeslotRemovedEvent extends IDomainEvent<{
  calendarId: string
  timeslotId: string;
}> { readonly type: 'ScheduledTimeslotRemoved'; }

export interface ICalendarRemovedEvent extends IDomainEvent<{
  calendarId: string
}> { readonly type: 'CalendarRemoved'; }

// Failure Events

export interface ICalendarCreationFailedEvent extends IDomainEvent<{ 
  calendarId: string; 
  reason: ViolationReason; 
  message: string; 
}> {
  readonly type: 'CalendarCreationFailed';
}

export interface ITimeslotSchedulingFailedEvent extends IDomainEvent<{
  calendarId: string; 
  timeslotId: string; 
  reason: ViolationReason; 
  message: string;
}> { readonly type: 'TimeslotSchedulingFailed'; }

export interface ITimeslotReschedulingFailedEvent extends IDomainEvent<{
  calendarId: string; 
  timeslotId: string; 
  reason: ViolationReason; 
  message: string;
}> { readonly type: 'TimeslotReschedulingFailed'; }

export interface IScheduledTimeslotRemovalFailedEvent extends IDomainEvent<{
  calendarId: string; 
  timeslotId: string; 
  reason: ViolationReason; 
  message: string;
}> { readonly type: 'ScheduledTimeslotRemovalFailed'; }

export interface ICalendarRemovalFailedEvent extends IDomainEvent<{
  calendarId: string; 
  reason: ViolationReason; 
  message: string;
}> { readonly type: 'CalendarRemovalFailed'; }

export type TCalendarEventUnion =
  ICalendarCreatedEvent
  | ITimeslotScheduledEvent
  | ITimeslotRescheduledEvent
  | IScheduledTimeslotRemovedEvent
  | ICalendarRemovedEvent
  | ICalendarCreationFailedEvent
  | ICalendarRemovalFailedEvent
  | ITimeslotSchedulingFailedEvent
  | IScheduledTimeslotRemovalFailedEvent
  | ITimeslotReschedulingFailedEvent;