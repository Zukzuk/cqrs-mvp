import { BaseAggregate } from '@daveloper/cqrs';
import { TCalendarEventUnion, TTimeslot } from '@daveloper/interfaces';
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
import { RescheduleTimeslot, ScheduleTimeslot } from '../commands';
import {
  calendarMustExist,
  calendarMustNotExist,
  calendarMustNotBeRemoved,
  timeRangeValid,
  timeslotMustNotExist,
  timeslotMustExist,
  noCalendarOverlap,
} from './BusinessRules';

export class Calendar extends BaseAggregate<TCalendarEventUnion> {
  public id!: string;
  private exists = false;
  private removed = false;
  private readonly timeslots = new Map<string, TTimeslot>();
  
  // Commands

  createCalendar(calendarId: string, correlationId: string) {
    const payload = { calendarId };
    this.aggregateAndRaiseEvents(payload, correlationId, {
      rules: [
        () => calendarMustNotBeRemoved(this.removed),
        () => calendarMustNotExist(this.exists),
      ],
      SuccessEvent: CalendarCreated,
      FailedEvent: CalendarCreationFailed,
    });
  }

  removeCalendar(calendarId: string, correlationId: string) {
    const payload = { calendarId };
    this.aggregateAndRaiseEvents(payload, correlationId, {
      rules: [
        () => calendarMustExist(this.exists, this.removed),
        () => calendarMustNotBeRemoved(this.removed),
      ],
      SuccessEvent: CalendarRemoved,
      FailedEvent: CalendarRemovalFailed,
    });
  }

  scheduleTimeslot(payload: ScheduleTimeslot['payload'], correlationId: string) {
    this.aggregateAndRaiseEvents(payload, correlationId, {
      // Order: existence → not removed → payload shape → uniqueness → overlap
      rules: [
        () => calendarMustExist(this.exists, this.removed),
        () => calendarMustNotBeRemoved(this.removed),
        () => timeRangeValid(payload.start, payload.end),
        () => timeslotMustNotExist(this.timeslots.has(payload.timeslotId)),
        () => noCalendarOverlap(payload.start, payload.end, this.timeslots),
      ],
      SuccessEvent: TimeslotScheduled,
      FailedEvent: TimeslotSchedulingFailed,
    });
  }

  rescheduleTimeslot(payload: RescheduleTimeslot['payload'], correlationId: string) {
    this.aggregateAndRaiseEvents(payload, correlationId, {
      rules: [
        () => calendarMustExist(this.exists, this.removed),
        () => timeRangeValid(payload.start, payload.end),
        () => timeslotMustExist(this.timeslots.has(payload.timeslotId)),
        // exclude the timeslot being moved from the overlap check
        () => noCalendarOverlap(payload.start, payload.end, this.timeslots, payload.timeslotId),
      ],
      SuccessEvent: TimeslotRescheduled,
      FailedEvent: TimeslotReschedulingFailed,
    });
  }

  removeSchedule(calendarId: string, timeslotId: string, correlationId: string) {
    const payload = { calendarId, timeslotId };
    this.aggregateAndRaiseEvents(payload, correlationId, {
      rules: [
        () => calendarMustExist(this.exists, this.removed),
        () => timeslotMustExist(this.timeslots.has(timeslotId)),
      ],
      SuccessEvent: ScheduledTimeslotRemoved,
      FailedEvent: ScheduledTimeslotRemovalFailed,
    });
  }

  // Event appliers

  private onCalendarCreated(e: CalendarCreated & { type: 'CalendarCreated' }) {
    this.exists = true;
  }

  private onTimeslotScheduled(e: TimeslotScheduled & { type: 'TimeslotScheduled' }) {
    const { timeslotId, ...rest } = e.payload;
    this.timeslots.set(timeslotId, { timeslotId, ...rest });
  }

  private onTimeslotRescheduled(e: TimeslotRescheduled & { type: 'TimeslotRescheduled' }) {
    const existing = this.timeslots.get(e.payload.timeslotId);
    if (!existing) return;
    this.timeslots.set(e.payload.timeslotId, {
      ...existing,
      start: e.payload.start,
      end: e.payload.end,
    });
  }

  private onScheduledTimeslotRemoved(e: ScheduledTimeslotRemoved & { type: 'ScheduledTimeslotRemoved' }) {
    this.timeslots.delete(e.payload.timeslotId);
  }

  private onCalendarRemoved(_e: CalendarRemoved & { type: 'CalendarRemoved' }) {
    this.removed = true;
    this.timeslots.clear();
  }
}
