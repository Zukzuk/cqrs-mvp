import { IDomainEvent } from "../DomainEvents";
import { TISODateTime, TViolationReason } from "../Types";

// Calendar Created Events
export interface ICalendarCreatedEvent extends IDomainEvent<{
  calendarId: string;
}> { readonly type: 'CalendarCreated'; }

export interface ICalendarCreationFailedEvent extends IDomainEvent<ICalendarCreatedEvent["payload"] & { 
  reason: TViolationReason; 
  message: string; 
}> { readonly type: 'CalendarCreationFailed'; }

// Timeslot Scheduled Events
export interface ITimeslotScheduledEvent extends IDomainEvent<{
  calendarId: string
  timeslotId: string;
  title: string;
  start: TISODateTime;
  end: TISODateTime;
  location?: string;
  description?: string;
}> { readonly type: 'TimeslotScheduled'; }

export interface ITimeslotSchedulingFailedEvent extends IDomainEvent<ITimeslotScheduledEvent["payload"] & {
  reason: TViolationReason; 
  message: string;
}> { readonly type: 'TimeslotSchedulingFailed'; }

// Timeslot Rescheduled Events
export interface ITimeslotRescheduledEvent extends IDomainEvent<{
  calendarId: string;
  timeslotId: string;
  start: TISODateTime;
  end: TISODateTime;
}> { readonly type: 'TimeslotRescheduled'; }

export interface ITimeslotReschedulingFailedEvent extends IDomainEvent<ITimeslotRescheduledEvent["payload"] & {
  reason: TViolationReason; 
  message: string;
}> { readonly type: 'TimeslotReschedulingFailed'; }

// Scheduled Timeslot Removed Events
export interface IScheduledTimeslotRemovedEvent extends IDomainEvent<{
  calendarId: string
  timeslotId: string;
}> { readonly type: 'ScheduledTimeslotRemoved'; }

export interface IScheduledTimeslotRemovalFailedEvent extends IDomainEvent<IScheduledTimeslotRemovedEvent["payload"] & {
  reason: TViolationReason; 
  message: string;
}> { readonly type: 'ScheduledTimeslotRemovalFailed'; }

// Calendar Removed Events
export interface ICalendarRemovedEvent extends IDomainEvent<{
  calendarId: string
}> { readonly type: 'CalendarRemoved'; }

export interface ICalendarRemovalFailedEvent extends IDomainEvent<ICalendarRemovedEvent["payload"] & {
  reason: TViolationReason; 
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