import { RuleResult, Timeslot } from '@daveloper/interfaces';
import { AggregateRoot } from './AggregateRoot';
import { ScheduleTimeslot } from '../commands';
import {
  CalendarCreated,
  CalendarRemoved,
  TimeslotScheduled,
  TimeslotRescheduled,
  ScheduledTimeslotRemoved,
  CalendarCreationFailed,
  TimeslotSchedulingFailed,
  TimeslotReschedulingFailed,
  ScheduledTimeslotRemovalFailed,
  CalendarRemovalFailed,
} from '../events';
import {
  calendarMustExist,
  calendarMustNotExist,
  calendarMustNotBeRemoved,
  timeRangeValid,
  timeslotMustNotExist,
  timeslotMustExist,
  noCalendarOverlap,
} from './BusinessRules';

export class Calendar extends AggregateRoot {
  public id!: string; // calendarId == userId (MVP)
  private exists = false;
  private removed = false;
  private timeslots = new Map<string, Timeslot>();

  scheduleTimeslot(payload: ScheduleTimeslot["payload"], correlationId: string) {
    const base = { calendarId: payload.calendarId, timeslotId: payload.timeslotId };

    let v: RuleResult;

    v = calendarMustExist(this.exists, this.removed);
    if (v) return this.apply(new TimeslotSchedulingFailed({ ...base, ...v }, correlationId));

    v = timeRangeValid(payload.start, payload.end);
    if (v) return this.apply(new TimeslotSchedulingFailed({ ...base, ...v }, correlationId));

    v = timeslotMustNotExist(this.timeslots.has(payload.timeslotId));
    if (v) return this.apply(new TimeslotSchedulingFailed({ ...base, ...v }, correlationId));

    v = noCalendarOverlap(payload.start, payload.end, this.timeslots);
    if (v) return this.apply(new TimeslotSchedulingFailed({ ...base, ...v }, correlationId));

    this.apply(new TimeslotScheduled({ ...payload }, correlationId));
  }

  rescheduleTimeslot(
    payload: { calendarId: string; timeslotId: string; start: string; end: string },
    correlationId: string
  ) {
    const base = { calendarId: payload.calendarId, timeslotId: payload.timeslotId };

    let v: RuleResult;

    v = calendarMustExist(this.exists, this.removed);
    if (v) return this.apply(new TimeslotReschedulingFailed({ ...base, ...v }, correlationId));

    v = timeRangeValid(payload.start, payload.end);
    if (v) return this.apply(new TimeslotReschedulingFailed({ ...base, ...v }, correlationId));

    v = timeslotMustExist(this.timeslots.has(payload.timeslotId));
    if (v) return this.apply(new TimeslotReschedulingFailed({ ...base, ...v }, correlationId));

    v = noCalendarOverlap(payload.start, payload.end, this.timeslots, payload.timeslotId);
    if (v) return this.apply(new TimeslotReschedulingFailed({ ...base, ...v }, correlationId));

    this.apply(new TimeslotRescheduled({ ...payload }, correlationId));
  }

  createCalendar(calendarId: string, correlationId: string) {
    let v: RuleResult;

    v = calendarMustNotBeRemoved(this.removed);
    if (v) return this.apply(new CalendarCreationFailed({ calendarId, ...v }, correlationId));

    v = calendarMustNotExist(this.exists);
    if (v) return this.apply(new CalendarCreationFailed({ calendarId, ...v }, correlationId));

    this.apply(new CalendarCreated({ calendarId }, correlationId));
  }

  removeSchedule(calendarId: string, timeslotId: string, correlationId: string) {
    let v: RuleResult;

    v = calendarMustExist(this.exists, this.removed);
    if (v) return this.apply(new ScheduledTimeslotRemovalFailed({ calendarId, timeslotId, ...v }, correlationId));

    v = timeslotMustExist(this.timeslots.has(timeslotId));
    if (v) return this.apply(new ScheduledTimeslotRemovalFailed({ calendarId, timeslotId, ...v }, correlationId));

    this.apply(new ScheduledTimeslotRemoved({ calendarId, timeslotId }, correlationId));
  }

  removeCalendar(calendarId: string, correlationId: string) {
    let v: RuleResult;

    v = calendarMustExist(this.exists, this.removed);
    if (v) return this.apply(new CalendarRemovalFailed({ calendarId, ...v }, correlationId));

    if (this.removed) {
      return this.apply(new CalendarRemovalFailed({
        calendarId, reason: 'Removed', message: 'Calendar already removed'
      }, correlationId));
    }

    this.apply(new CalendarRemoved({ calendarId }, correlationId));
  }

  // Event Appliers

  private onCalendarCreated(e: CalendarCreated & { type: 'CalendarCreated' }) {
    this.id = e.payload.calendarId;
    this.exists = true;

  }
  private onTimeslotScheduled(e: TimeslotScheduled & { type: 'TimeslotScheduled' }) {
    const { timeslotId, ...rest } = e.payload;
    this.timeslots.set(timeslotId, { timeslotId, ...rest });
  }

  private onTimeslotRescheduled(e: TimeslotRescheduled & { type: 'TimeslotRescheduled' }) {
    const existing = this.timeslots.get(e.payload.timeslotId);
    if (!existing) return; // defensive
    this.timeslots.set(e.payload.timeslotId, { ...existing, start: e.payload.start, end: e.payload.end });
  }

  private onScheduledTimeslotRemoved(e: ScheduledTimeslotRemoved & { type: 'ScheduledTimeslotRemoved' }) {
    this.timeslots.delete(e.payload.timeslotId);
  }

  private onCalendarRemoved(_e: CalendarRemoved & { type: 'CalendarRemoved' }) {
    this.removed = true;
    this.timeslots.clear();
  }
}