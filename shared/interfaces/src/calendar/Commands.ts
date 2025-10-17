import { ICommand } from "../Commands";
import { TISODateTime } from "../Types";

export interface ICreateCalendarCommand extends ICommand<{ 
    calendarId: string; // == userId (MVP)
  }> { readonly type: 'CreateCalendar'; }

export interface IScheduleTimeslotCommand extends ICommand<{
    calendarId: string;
    timeslotId: string; // client-generated id
    title: string;
    start: TISODateTime;
    end: TISODateTime;
    location?: string;
    description?: string;
  }> { readonly type: 'ScheduleTimeslot'; }

export interface IRescheduleTimeslotCommand extends ICommand<{
  calendarId: string;
  timeslotId: string; // must already exist
  start: TISODateTime;
  end: TISODateTime;
}> { readonly type: 'RescheduleTimeslot'; }

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
  | IRescheduleTimeslotCommand
  | IRemoveScheduledTimeslotCommand
  | IRemoveCalendarCommand;