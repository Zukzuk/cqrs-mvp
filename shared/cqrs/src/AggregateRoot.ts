import type { IDomainEvent } from '@daveloper/interfaces';

export abstract class AggregateRoot<E extends IDomainEvent = IDomainEvent> {
    public id?: string;
    private _events: E[] = [];

    // Binds the aggregate to a specific stream id, 
    // enforcing immutability after the first assignment
    public bindId(streamId: string) {
        if (!this.id) { this.id = streamId; return; }
        if (this.id !== streamId) {
            throw new Error(`Aggregate id reassignment attempted: existing=${this.id} new=${streamId}`);
        }
    }

    // Raises a new domain event and applies it to the aggregate state
    protected raise(event: E) {
        this.apply(event);
        this._events.push(event);
    }

    // Applies a domain event to the aggregate state by invoking the corresponding handler
    protected apply(event: E) {
        const applier = (this as any)[`on${event.type}`];
        if (typeof applier === 'function') applier.call(this, event);
    }

    // Rehydrates the aggregate state from a sequence of historical events
    loadFromHistory(events: E[]) {
        for (const e of events) this.apply(e);
        this._events = [];
    }

    // Retrieves and clears the list of uncommitted domain events
    get uncommittedEvents(): E[] { return this._events; }

    // Clears the list of uncommitted domain events
    clearEvents() { this._events = []; }
}
