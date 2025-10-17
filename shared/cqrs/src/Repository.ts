import type { IEventStore, IDomainEvent } from '@daveloper/interfaces';
import { AggregateRoot } from './AggregateRoot';

export class BaseRepository<Agg extends AggregateRoot<Evt>, Evt extends IDomainEvent> {
    constructor(private readonly store: IEventStore) { }

    async load(id: string, factory: () => Agg): Promise<Agg> {
        const agg = factory();
        const history = await this.store.loadStream(id);
        agg.loadFromHistory(history as unknown as Evt[]);
        return agg;
    }

    async save(agg: Agg): Promise<void> {
        const id = (agg as any).id as string;
        if (!id) throw new Error('Aggregate has no id');
        const events = agg.uncommittedEvents as IDomainEvent[];
        if (!events.length) return;
        await this.store.appendToStream(id, events);
    }
}
