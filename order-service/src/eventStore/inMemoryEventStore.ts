import { IEventStore } from './eventStore';
import { DomainEvent } from '../events';

export class InMemoryEventStore implements IEventStore {
  private store: Record<string, DomainEvent[]> = {};

  async appendToStream(streamId: string, events: DomainEvent[]) {
    this.store[streamId] = [
      ...(this.store[streamId]||[]),
      ...events
    ];
  }

  async loadStream(streamId: string): Promise<DomainEvent[]> {
    return [...(this.store[streamId]||[])];
  }

  async loadAllEvents(): Promise<DomainEvent[]> {
    // flatten all streams in insertion order
    return Object.values(this.store).flat();
  }
}
