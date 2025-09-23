import { CalendarEvent } from './types';

export abstract class AggregateRoot {
  private _events: CalendarEvent[] = [];

  protected apply(event: CalendarEvent) {
    this._events.push(event);
    const handler = (this as any)[`on${event.type}`];
    if (handler) handler.call(this, event);
  }
  
  get uncommittedEvents() { return this._events; }
  clearEvents() { this._events = []; }
}
