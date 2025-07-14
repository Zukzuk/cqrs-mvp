import { IDomainEvent } from '@daveloper/interfaces';

export interface IStoredEvent extends IDomainEvent {
    streamId: string;
    sequence: number;
    timestamp: string;
}

export interface ICounterDoc {
    _id: string; // unique identifier for the stream
    seq: number; // current sequence number
}

export interface IEventStore {
    appendToStream(streamId: string, events: IDomainEvent[]): Promise<void>;
    loadStream(streamId: string, from?: string): Promise<IStoredEvent[]>;
    loadAllEvents(from?: string): Promise<IStoredEvent[]>;
}
