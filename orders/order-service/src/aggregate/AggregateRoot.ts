import { TOrderEventUnion } from '@daveloper/interfaces';

export abstract class AggregateRoot {
  private _events: TOrderEventUnion[] = [];

  /** Emit a NEW domain event (record + apply). */
  protected raise(event: TOrderEventUnion) {
    this.mutate(event);
    this._events.push(event);
  }

  /** Apply an event to mutate state (no recording). Use during history replay. */
  protected mutate(event: TOrderEventUnion) {
    const applier = (this as any)[`on${event.type}`];
    if (applier) applier.call(this, event);
  }

  /** Rehydrate aggregate state from stored history (no uncommitted events). */
  public loadFromHistory(events: TOrderEventUnion[]) {
    for (const e of events) this.mutate(e);
    this._events = [];
  }

  get uncommittedEvents() { return this._events; }
  clearEvents() { this._events = []; }
}
