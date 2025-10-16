import { TCalendarEventUnion } from "@daveloper/interfaces";

export abstract class AggregateRoot {
  private _events: TCalendarEventUnion[] = [];

  /** Emit a NEW domain event (record + apply). */
  protected raise(event: TCalendarEventUnion) {
    this.mutate(event);
    this._events.push(event);
  }

  /** Apply an event to mutate state (no recording). Use during history replay. */
  protected mutate(event: TCalendarEventUnion) {
    const applier = (this as any)[`on${event.type}`];
    if (applier) applier.call(this, event);
  }

  /** Rehydrate aggregate state from stored history (no uncommitted events). */
  public loadFromHistory(events: TCalendarEventUnion[]) {
    for (const e of events) this.mutate(e);
    this._events = [];
  }

  get uncommittedEvents() { return this._events; }
  clearEvents() { this._events = []; }
}
