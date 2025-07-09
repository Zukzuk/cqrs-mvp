import { DomainEvent } from '../events';

export interface IEventStore {
  /** Append new events to a given aggregate stream */
  appendToStream( streamId: string, events: DomainEvent[] ): Promise<void>;

  /** Load all events for a single aggregate */
  loadStream( streamId: string ): Promise<DomainEvent[]>;

  /** Load *all* events from *every* stream (in chronological order) */
  loadAllEvents(): Promise<DomainEvent[]>;
}
