import { DomainEvent } from './events';
import { AggregateRoot } from './aggregateRoot';
export class InMemoryRepository<T extends AggregateRoot> {
  private store: Record<string, DomainEvent[]> = {};
  async load(id: string, factory: () => T): Promise<T> {
    const agg = factory();
    for (const e of this.store[id] || []) (agg as any).apply(e);
    console.log("load", agg)
    return agg;
  }
  async save(agg: T) {
    console.log("save", agg.uncommittedEvents)
    const id = (agg as any).id;
    if (!id) throw new Error('No id');
    this.store[id] = [...(this.store[id]||[]), ...agg.uncommittedEvents];
    agg.clearEvents();
  }
}