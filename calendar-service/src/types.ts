export interface ICommand<T extends string, P> {
    type: T;
    payload: P;
    correlationId: string;
}

export interface IDomainEvent<T extends string, P> {
    type: T;
    payload: P;
    correlationId: string;
}

export type ISODateTime = string; // must be valid ISO-8601

// Commands
export type CreateCalendarPayload = { userId: string };
export type ScheduleTimeslotPayload = {
    calendarId: string;          // == userId for MVP
    timeslotId: string;          // client-generated id for idempotency/upsert
    title: string;
    start: ISODateTime;
    end: ISODateTime;
    location?: string;
    description?: string;
};
export type RemoveSchedulePayload = {
    calendarId: string;
    timeslotId: string;
};
export type RemoveCalendarPayload = { calendarId: string };

// Events
export type CalendarCreatedPayload = { calendarId: string };
export type TimeslotScheduledPayload = {
    calendarId: string;
    timeslotId: string;
    title: string;
    start: ISODateTime;
    end: ISODateTime;
    location?: string;
    description?: string;
    isUpdate: boolean;           // true if upsert updated an existing slot
};
export type ScheduleRemovedPayload = {
    calendarId: string;
    timeslotId: string;
};
export type CalendarRemovedPayload = { calendarId: string };

// Discriminated unions for convenience
export type CalendarCommand =
    | ICommand<'CreateCalendar', CreateCalendarPayload>
    | ICommand<'ScheduleTimeslot', ScheduleTimeslotPayload>
    | ICommand<'RemoveSchedule', RemoveSchedulePayload>
    | ICommand<'RemoveCalendar', RemoveCalendarPayload>;

export type CalendarEvent =
    | IDomainEvent<'CalendarCreated', CalendarCreatedPayload>
    | IDomainEvent<'TimeslotScheduled', TimeslotScheduledPayload>
    | IDomainEvent<'ScheduleRemoved', ScheduleRemovedPayload>
    | IDomainEvent<'CalendarRemoved', CalendarRemovedPayload>;
