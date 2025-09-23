import { AggregateRoot } from './aggregate/aggregateRoot';
import { CalendarEvent } from './types';
import { IEventStore } from '@daveloper/interfaces';

export class Repository<T extends AggregateRoot> {
  constructor(private eventStore: IEventStore) { }

  async load(id: string, factory: () => T): Promise<T> {
    const agg = factory();
    const past: CalendarEvent[] = await this.eventStore.loadStream(id);
    for (const e of past) (agg as any).apply(e);
    return agg;
  }

  async save(agg: T) {
    const id: string = (agg as any).id;
    if (!id) throw new Error('No id on aggregate');
    const newEvents = agg.uncommittedEvents;
    if (!newEvents.length) return;
    await this.eventStore.appendToStream(id, newEvents);
  }
}
