import { Timeslot } from '@daveloper/interfaces';
import { AggregateRoot } from './AggregateRoot';
import { CalendarCreated, CalendarRemoved, ScheduledTimeslotRemoved, TimeslotScheduled } from '../events';
import { ScheduleTimeslot } from '../commands';

export class Calendar extends AggregateRoot {
  public id!: string; // calendarId == userId (MVP)
  private exists = false;
  private removed = false;
  private timeslots = new Map<string, Timeslot>();

  // ------------- Commands -------------

  createCalendar(calendarId: string, correlationId: string) {
    if (this.removed) throw new Error('Calendar has been removed');
    if (this.exists) return; // idempotent
    
    this.apply(new CalendarCreated({ 
      calendarId 
    }, correlationId));
  }

  scheduleTimeslot(p: ScheduleTimeslot["payload"], correlationId: string) {
    if (!this.exists || this.removed) throw new Error('Calendar does not exist');
    if (p.start >= p.end) throw new Error('Invalid time range');

    const isUpdate = this.timeslots.has(p.timeslotId);
    // MVP: allow overlaps; you can add overlap detection later if needed.

    this.apply(new TimeslotScheduled({
      calendarId: p.calendarId,
      timeslotId: p.timeslotId,
      title: p.title,
      start: p.start,
      end: p.end,
      location: p.location,
      description: p.description,
      isUpdate
    }, correlationId));
  }

  removeSchedule(calendarId: string, timeslotId: string, correlationId: string) {
    if (!this.exists || this.removed) throw new Error('Calendar does not exist');
    if (!this.timeslots.has(timeslotId)) return; // idempotent
    
    this.apply(new ScheduledTimeslotRemoved({ 
      calendarId, 
      timeslotId 
    }, correlationId));
  }

  removeCalendar(calendarId: string, correlationId: string) {
    if (!this.exists) return; // idempotent
    if (this.removed) return; // idempotent
    
    this.apply(new CalendarRemoved({ 
      calendarId 
    }, correlationId));
  }

  // ------------- Event appliers -------------
  
  private onCalendarCreated(e: CalendarCreated & { type: 'CalendarCreated' }) {
    this.id = e.payload.calendarId;
    this.exists = true;
  }

  private onTimeslotScheduled(e: TimeslotScheduled & { type: 'TimeslotScheduled' }) {
    const { timeslotId, ...rest } = e.payload;
    this.timeslots.set(timeslotId, { timeslotId, ...rest });
  }

  private onScheduledTimeslotRemoved(e: ScheduledTimeslotRemoved & { type: 'ScheduledTimeslotRemoved' }) {
    this.timeslots.delete(e.payload.timeslotId);
  }

  private onCalendarRemoved(_e: CalendarRemoved & { type: 'CalendarRemoved' }) {
    this.removed = true;
    this.timeslots.clear();
  }
}
