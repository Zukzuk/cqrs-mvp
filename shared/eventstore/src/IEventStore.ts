import { IDomainEvent } from '@daveloper/domain';

export interface StoredEvent extends IDomainEvent {
    timestamp: string;
}

export interface IEventStore {
    appendToStream(streamId: string, events: IDomainEvent[]): Promise<void>;
    loadStream(streamId: string, from?: string): Promise<StoredEvent[]>;
    loadAllEvents(from?: string): Promise<StoredEvent[]>;
}
