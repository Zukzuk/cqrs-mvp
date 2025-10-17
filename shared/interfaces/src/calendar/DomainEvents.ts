import { IDomainEvent } from "../DomainEvents";
import { ISODateTime, ViolationReason } from "../Types";

// Calendar Created Events
export interface ICalendarCreatedEvent extends IDomainEvent<{
  calendarId: string;
}> { readonly type: 'CalendarCreated'; }

export interface ICalendarCreationFailedEvent extends IDomainEvent<ICalendarCreatedEvent["payload"] & { 
  reason: ViolationReason; 
  message: string; 
}> { readonly type: 'CalendarCreationFailed'; }

// Timeslot Scheduled Events
export interface ITimeslotScheduledEvent extends IDomainEvent<{
  calendarId: string
  timeslotId: string;
  title: string;
  start: ISODateTime;
  end: ISODateTime;
  location?: string;
  description?: string;
}> { readonly type: 'TimeslotScheduled'; }

export interface ITimeslotSchedulingFailedEvent extends IDomainEvent<ITimeslotScheduledEvent["payload"] & {
  reason: ViolationReason; 
  message: string;
}> { readonly type: 'TimeslotSchedulingFailed'; }

// Timeslot Rescheduled Events
export interface ITimeslotRescheduledEvent extends IDomainEvent<{
  calendarId: string;
  timeslotId: string;
  start: ISODateTime;
  end: ISODateTime;
}> { readonly type: 'TimeslotRescheduled'; }

export interface ITimeslotReschedulingFailedEvent extends IDomainEvent<ITimeslotRescheduledEvent["payload"] & {
  reason: ViolationReason; 
  message: string;
}> { readonly type: 'TimeslotReschedulingFailed'; }

// Scheduled Timeslot Removed Events
export interface IScheduledTimeslotRemovedEvent extends IDomainEvent<{
  calendarId: string
  timeslotId: string;
}> { readonly type: 'ScheduledTimeslotRemoved'; }

export interface IScheduledTimeslotRemovalFailedEvent extends IDomainEvent<IScheduledTimeslotRemovedEvent["payload"] & {
  reason: ViolationReason; 
  message: string;
}> { readonly type: 'ScheduledTimeslotRemovalFailed'; }

// Calendar Removed Events
export interface ICalendarRemovedEvent extends IDomainEvent<{
  calendarId: string
}> { readonly type: 'CalendarRemoved'; }

export interface ICalendarRemovalFailedEvent extends IDomainEvent<ICalendarRemovedEvent["payload"] & {
  reason: ViolationReason; 
  message: string;
}> { readonly type: 'CalendarRemovalFailed'; }

// Event Classes
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