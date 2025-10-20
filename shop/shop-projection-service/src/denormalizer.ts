import { TOrderEventUnion } from '@daveloper/interfaces';
import { mapOrderCreated, mapOrderShipped } from '@daveloper/denormalizers';
import { trace } from '@daveloper/opentelemetry';
import { OrderRepository } from './repository';
import { Socket } from 'socket.io-client';

export class OrderDenormalizer {
  constructor(
    private readonly repository: OrderRepository,
    private readonly socket: Socket
  ) { }

  async handle(evt: TOrderEventUnion): Promise<void> {
    trace.getActiveSpan()?.setAttribute(
      'messaging.message.conversation_id',
      evt.correlationId
    );

    let view;
    if (evt.type === 'OrderCreated') {
      view = mapOrderCreated(evt);
    } else if (evt.type === 'OrderShipped') {
      view = mapOrderShipped(evt);
    }

    if (!view) return;

    console.log(`💾 [projection-denorm] saving order for user=${view.userId}`, view);
    await this.repository.save(view);

    console.log('➡️ [projection-socket] sending order_update', view);
    this.socket.emit('order_update', view);
  }
}

import {
  TCalendarEventUnion,
  ITimeslotScheduledEvent,
  ITimeslotRescheduledEvent,
  IScheduledTimeslotRemovedEvent,
} from '@daveloper/interfaces'
import { CalendarRepository } from './repository'

export class CalendarDenormalizer {
  constructor(private readonly repo: CalendarRepository, private readonly socket: Socket) { }

  async handle(evt: TCalendarEventUnion) {

    trace.getActiveSpan()?.setAttribute(
      'messaging.message.conversation_id',
      evt.correlationId
    );
    
    if (evt.type === 'CalendarCreated') {
      await this.repo.upsert({ calendarId: evt.payload.calendarId, userId: evt.payload.calendarId, timeslots: [], updatedAt: new Date().toISOString() })
      this.socket.emit('calendar_update', { userId: evt.payload.calendarId })
      return
    }

    if (evt.type === 'TimeslotScheduled') {
      const e = evt as ITimeslotScheduledEvent
      await this.repo.addOrUpdateTimeslot(e.payload.calendarId, {
        timeslotId: e.payload.timeslotId,
        title: e.payload.title,
        start: e.payload.start,
        end: e.payload.end,
        location: e.payload.location,
        description: e.payload.description,
      })
      this.socket.emit('calendar_update', { userId: e.payload.calendarId, timeslot: { ...e.payload } })
      return
    }

    if (evt.type === 'TimeslotRescheduled') {
      const e = evt as ITimeslotRescheduledEvent
      await this.repo.addOrUpdateTimeslot(e.payload.calendarId, {
        timeslotId: e.payload.timeslotId,
        title: '',
        start: e.payload.start,
        end: e.payload.end,
      } as any)
      this.socket.emit('calendar_update', { userId: e.payload.calendarId, timeslot: { timeslotId: e.payload.timeslotId, start: e.payload.start, end: e.payload.end } })
      return
    }

    if (evt.type === 'ScheduledTimeslotRemoved') {
      const e = evt as IScheduledTimeslotRemovedEvent
      await this.repo.removeTimeslot(e.payload.calendarId, e.payload.timeslotId)
      this.socket.emit('calendar_update', { userId: e.payload.calendarId, removeTimeslotId: e.payload.timeslotId })
      return
    }
  }
}

