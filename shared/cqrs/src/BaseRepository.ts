import type { IEventStore, IDomainEvent } from '@daveloper/interfaces';
import { AggregateRoot } from './AggregateRoot';

export class BaseRepository<Agg extends AggregateRoot<IDomainEvent>> {
    constructor(private readonly store: IEventStore) { }

    // Loads an aggregate by its id, rehydrating it from stored events
    async load(id: string, factory: () => Agg): Promise<Agg> {
        const agg = factory();
        // always bind stream id on load so failure events are appendable pre-creation
        agg.bindId(id);
        const history = await this.store.loadStream(id);
        agg.loadFromHistory(history);
        return agg;
    }

    // Saves the uncommitted events of an aggregate to the event store
    async save(agg: Agg): Promise<void> {
        const id = agg.id;
        if (!id) throw new Error('Aggregate has no id');
        const events = agg.uncommittedEvents as IDomainEvent[];
        if (!events.length) return;
        await this.store.appendToStream(id, events);
    }
}
