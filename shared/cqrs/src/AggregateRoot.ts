import type { IDomainEvent } from '@daveloper/interfaces';

export abstract class AggregateRoot<E extends IDomainEvent = IDomainEvent> {
    public id?: string;
    private _events: E[] = [];

    protected raise(event: E) {
        this.apply(event);
        this._events.push(event);
    }

    protected apply(event: E) {
        const applier = (this as any)[`on${event.type}`];
        if (typeof applier === 'function') applier.call(this, event);
    }

    loadFromHistory(events: E[]) {
        for (const e of events) this.apply(e);
        this._events = [];
    }

    get uncommittedEvents(): E[] { return this._events; }
    clearEvents() { this._events = []; }
}
