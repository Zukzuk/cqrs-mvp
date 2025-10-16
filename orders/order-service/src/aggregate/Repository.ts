import { AggregateRoot } from './AggregateRoot';
import { IEventStore } from '@daveloper/interfaces';

export class Repository<T extends AggregateRoot> {
  constructor(private eventStore: IEventStore) { }

  async load(id: string, factory: () => T): Promise<T> {
    const agg = factory();
    const past = await this.eventStore.loadStream(id);
    (agg as any).loadFromHistory(past as any);
    return agg;
  }

  async save(agg: T) {
    const id: string = (agg as any).id;
    if (!id) throw new Error('No id on aggregate');

    const newEvents = agg.uncommittedEvents;
    if (!newEvents.length) return;

    await this.eventStore.appendToStream(id, newEvents);
    console.log(`💾 [order-write] save data for id=${id}`, newEvents);
  }
}
