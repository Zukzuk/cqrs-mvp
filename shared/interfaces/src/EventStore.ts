import { IDomainEvent } from './index';

export interface IAppendedDomainEvent extends IDomainEvent {
    streamId: string;
    sequence: number;
    timestamp: string;
}

export type TCounterMeta = {
    _id: string; // unique identifier for the stream
    seq: number; // current sequence number
}

export interface IEventStore {
    appendToStream(streamId: string, events: IDomainEvent[]): Promise<void>;
    loadStream(streamId: string, from?: string): Promise<IAppendedDomainEvent[]>;
    loadAllEvents(from?: string, limit?: number): Promise<IAppendedDomainEvent[]>;
}
