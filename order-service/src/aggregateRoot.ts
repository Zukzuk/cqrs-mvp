import { IOrderCreatedEvent } from '@daveloper/interfaces';

export abstract class AggregateRoot {

  private _events: IOrderCreatedEvent[] = [];

  protected apply(event: IOrderCreatedEvent) {
    this._events.push(event);
    const agg = (this as any)[`on${event.type}`];
    
    if (agg) agg.call(this, event);
  }

  get uncommittedEvents() { return this._events; }
  
  clearEvents() { this._events = []; }
}