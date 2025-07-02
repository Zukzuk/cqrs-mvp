import { DomainEvent } from './events';

export abstract class AggregateRoot {

  private _events: DomainEvent[] = [];

  protected apply(event: DomainEvent) {
    this._events.push(event);
    const agg = (this as any)[`on${event.type}`];
    if (agg) agg.call(this, event);
  }

  get uncommittedEvents() { return this._events; }
  
  clearEvents() { this._events = []; }
}