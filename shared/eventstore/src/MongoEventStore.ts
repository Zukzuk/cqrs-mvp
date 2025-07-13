import { Collection } from 'mongodb';
import { IEventStore, StoredEvent } from './IEventStore';
import { IDomainEvent } from '@daveloper/interfaces';

export class MongoEventStore implements IEventStore {
    constructor(private collection: Collection) {
        this.collection.createIndex({ streamId: 1, timestamp: 1 });
    }

    async appendToStream(streamId: string, events: IDomainEvent[]): Promise<void> {
        const docs = events.map(e => ({
            streamId,
            ...e,
            timestamp: new Date().toISOString(),
        }));
        await this.collection.insertMany(docs);
    }

    async loadStream(streamId: string, from?: string): Promise<StoredEvent[]> {
        const filter: any = { streamId };
        if (from) filter.timestamp = { $gt: new Date(from).toISOString() };
        return this.collection
            .find<StoredEvent>(filter)
            .sort({ timestamp: 1 })
            .toArray();
    }

    async loadAllEvents(from?: string): Promise<StoredEvent[]> {
        const filter: any = {};
        if (from) filter.timestamp = { $gt: new Date(from).toISOString() };
        return this.collection
            .find<StoredEvent>(filter)
            .sort({ timestamp: 1 })
            .toArray();
    }
}
