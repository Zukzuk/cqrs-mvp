// Root command interface

import { ISODateTime } from "./Types";

export interface ICommand<P = any> {
  readonly type: string;
  readonly payload: P;
  readonly correlationId: string;
}

// Order Commands

export interface ICreateOrderCommand extends ICommand<{
    orderId: string;
    userId: string;
    total: number;
  }> { readonly type: 'CreateOrder';}

export type TOrderCommandUnion =
  ICreateOrderCommand

// Calendar Commands

export interface ICreateCalendarCommand extends ICommand<{ 
    calendarId: string; // == userId (MVP)
  }> { readonly type: 'CreateCalendar'; }

export interface IScheduleTimeslotCommand extends ICommand<{
    calendarId: string;
    timeslotId: string; // client-generated id
    title: string;
    start: ISODateTime;
    end: ISODateTime;
    location?: string;
    description?: string;
  }> { readonly type: 'ScheduleTimeslot'; }

export interface IRemoveScheduledTimeslotCommand extends ICommand<{
    calendarId: string;
    timeslotId: string;
  }> { readonly type: 'RemoveScheduledTimeslot'; }

export interface IRemoveCalendarCommand extends ICommand<{
    calendarId: string;
  }> { readonly type: 'RemoveCalendar'; }

export type TCalendarCommandUnion =
  ICreateCalendarCommand
  | IScheduleTimeslotCommand
  | IRemoveScheduledTimeslotCommand
  | IRemoveCalendarCommand;

// Discriminated union of all command types for convenience

export type TCommandUnion =
  TOrderCommandUnion
  | TCalendarCommandUnion