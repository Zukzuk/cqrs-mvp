import fetch from 'node-fetch';
import { IDomainEvent, IEventStore, IStoredEvent } from '@daveloper/interfaces';
import { trace } from '@daveloper/opentelemetry';

export class HttpEventStore implements IEventStore {
  constructor(private baseUrl: string) { }

  async appendToStream(streamId: string, events: IDomainEvent[]): Promise<void> {
    const corr = Array.isArray(events) && events[0]?.correlationId;
    if (corr) trace.getActiveSpan()?.setAttribute('messaging.message.conversation_id', corr);

    const res = await fetch(`${this.baseUrl}/streams/${streamId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events),
    });

    if (!res.ok) throw new Error(`Failed to append events: HTTP ${res.status}`);
  }

  async loadStream(streamId: string, from?: string): Promise<IStoredEvent[]> {
    const url = new URL(`${this.baseUrl}/streams/${streamId}/events`);
    if (from) url.searchParams.set('from', from);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Failed to load stream: HTTP ${res.status}`);

    const data = (await res.json()) as IStoredEvent[];
    return data;
  }

  async loadAllEvents(from?: string, limit?: number): Promise<IStoredEvent[]> {
    const url = new URL(`${this.baseUrl}/events`);
    if (from) url.searchParams.set('from', from);
    if (limit) url.searchParams.set('limit', `${limit}`);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Failed to load events: HTTP ${res.status}`);

    const data = (await res.json()) as IStoredEvent[];
    return data;
  }
}
