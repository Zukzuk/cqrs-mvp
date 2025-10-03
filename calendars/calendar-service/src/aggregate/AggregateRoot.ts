import { TCalendarEventUnion } from "@daveloper/interfaces";

export abstract class AggregateRoot {
  private _events: TCalendarEventUnion[] = [];

  protected apply(event: TCalendarEventUnion) {
    // Record event for later publishing
    this._events.push(event);
    // Call event applier if it exists
    const applier = (this as any)[`on${event.type}`];
    if (applier) applier.call(this, event);
  }
  
  get uncommittedEvents() { return this._events; }
  clearEvents() { this._events = []; }
}
