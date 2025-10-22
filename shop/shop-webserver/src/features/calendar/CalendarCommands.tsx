import type { TISODateTime } from "@daveloper/interfaces";
import { v4 as uuid } from "uuid";
import type {
    ICreateCalendarCommand,
    IScheduleTimeslotCommand,
    IRescheduleTimeslotCommand,
    IRemoveScheduledTimeslotCommand,
    IRemoveCalendarCommand,
} from "@daveloper/interfaces";

export const CalendarCommands = {
    createCalendar(calendarId: string): ICreateCalendarCommand {
        return { type: "CreateCalendar", payload: { calendarId }, correlationId: uuid() } as any;
    },
    scheduleTimeslot(input: {
        calendarId: string; timeslotId: string; title: string; start: TISODateTime; end: TISODateTime; location?: string; description?: string;
    }): IScheduleTimeslotCommand {
        return { type: "ScheduleTimeslot", payload: input, correlationId: uuid() } as any;
    },
    rescheduleTimeslot(input: { calendarId: string; timeslotId: string; start: TISODateTime; end: TISODateTime; }): IRescheduleTimeslotCommand {
        return { type: "RescheduleTimeslot", payload: input, correlationId: uuid() } as any;
    },
    removeTimeslot(input: { calendarId: string; timeslotId: string; }): IRemoveScheduledTimeslotCommand {
        return { type: "RemoveScheduledTimeslot", payload: input, correlationId: uuid() } as any;
    },
    removeCalendar(calendarId: string): IRemoveCalendarCommand {
        return { type: "RemoveCalendar", payload: { calendarId }, correlationId: uuid() } as any;
    },
};