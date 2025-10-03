import { AggregateRoot } from './AggregateRoot';
import { IEventStore } from '@daveloper/interfaces';

export class Repository<T extends AggregateRoot> {
  constructor(private eventStore: IEventStore) { }

  async load(id: string, factory: () => T): Promise<T> {
    // Create empty aggregate
    const agg = factory();
    // Load past events and apply to aggregate
    const past = await this.eventStore.loadStream(id);
    // Apply each event to the aggregate
    for (const e of past) (agg as any).apply(e);
    return agg;
  }

  async save(agg: T) {
    // Get the id from the aggregate
    const id: string = (agg as any).id;
    if (!id) throw new Error('No id on aggregate');
    // Get uncommitted events and append to event store
    const newEvents = agg.uncommittedEvents;
    if (!newEvents.length) return;
    // Append uncommitted events
    await this.eventStore.appendToStream(id, newEvents);  }
}
