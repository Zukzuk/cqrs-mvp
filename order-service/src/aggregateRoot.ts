import { DomainEvent } from './events';
export abstract class AggregateRoot {
  private _events: DomainEvent[] = [];
  protected apply(event: DomainEvent) {
    console.log("apply", event);
    this._events.push(event);
    const handler = (this as any)[`on${event.type}`];
    if (handler) handler.call(this, event);
  }
  get uncommittedEvents() { return this._events; }
  clearEvents() { this._events = []; }
}