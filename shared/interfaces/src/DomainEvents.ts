// Root domain event interface

import { ISODateTime } from "./Types";

export interface IDomainEvent<P = any> {
  readonly type: string;
  readonly payload: P;
  readonly correlationId: string;
}

// Order Events

export interface IOrderCreatedEvent extends IDomainEvent<{
    orderId: string;
    userId: string;
    total: number;
  }> { readonly type: 'OrderCreated'; }

export type TOrderEventUnion =
  IOrderCreatedEvent;

// Calendar Events

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
    isUpdate: boolean; // true if upsert updated an existing slot
  }> { readonly type: 'TimeslotScheduled'; }

export interface IScheduledTimeslotRemovedEvent extends IDomainEvent<{
    calendarId: string
    timeslotId: string;
  }> { readonly type: 'ScheduledTimeslotRemoved'; }

export interface ICalendarRemovedEvent extends IDomainEvent<{
    calendarId: string
  }> { readonly type: 'CalendarRemoved'; }

export type TCalendarEventUnion =
  ICalendarCreatedEvent
  | ITimeslotScheduledEvent
  | IScheduledTimeslotRemovedEvent
  | ICalendarRemovedEvent;

// Discriminated union of all domain event types for convenience

export type TDomainEventUnion =
  TOrderEventUnion
  | TCalendarEventUnion;

// Union of all domain event "type" strings for convenience

export type TAllDomainEventTypes = TDomainEventUnion['type'];
