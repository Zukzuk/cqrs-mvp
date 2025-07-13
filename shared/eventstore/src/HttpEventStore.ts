import fetch from 'node-fetch';
import { IEventStore, StoredEvent } from './IEventStore';
import { IDomainEvent } from '@daveloper/interfaces';

export class HttpEventStore implements IEventStore {
  constructor(private baseUrl: string) {}

  async appendToStream(streamId: string, events: IDomainEvent[]): Promise<void> {
    const res = await fetch(`${this.baseUrl}/streams/${streamId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events),
    });
    if (!res.ok) {
      throw new Error(`Failed to append events: HTTP ${res.status}`);
    }
  }

  async loadStream(streamId: string, from?: string): Promise<StoredEvent[]> {
    const url = new URL(`${this.baseUrl}/streams/${streamId}/events`);
    if (from) {
      url.searchParams.set('from', from);
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Failed to load stream: HTTP ${res.status}`);
    }

    // Cast the JSON response to StoredEvent[]
    const data = await res.json();
    return data as StoredEvent[];
  }

  async loadAllEvents(from?: string): Promise<StoredEvent[]> {
    const url = new URL(`${this.baseUrl}/events`);
    if (from) {
      url.searchParams.set('from', from);
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Failed to load events: HTTP ${res.status}`);
    }

    // Cast the JSON response to StoredEvent[]
    const data = await res.json();
    return data as StoredEvent[];
  }
}
