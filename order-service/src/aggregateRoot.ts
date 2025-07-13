import { IDomainEvent } from '@daveloper/interfaces';

export abstract class AggregateRoot {

  private _events: IDomainEvent[] = [];

  protected apply(event: IDomainEvent) {
    this._events.push(event);
    const agg = (this as any)[`on${event.type}`];
    
    if (agg) agg.call(this, event);
  }

  get uncommittedEvents() { return this._events; }
  
  clearEvents() { this._events = []; }
}