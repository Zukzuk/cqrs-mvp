import { Collection } from 'mongodb';
import { IEventStore, IStoredEvent, ICounterDoc } from './EventStore';
import { IDomainEvent } from '@daveloper/interfaces';

export class MongoEventStore implements IEventStore {
    constructor(
        private events: Collection<IStoredEvent>,
        private counters: Collection<ICounterDoc>
    ) {
        this.events.createIndex({ sequence: 1 });
        this.events.createIndex({ streamId: 1, sequence: 1 });
    }

    private async nextSequence(streamId: string): Promise<number> {
        const doc = await this.counters.findOneAndUpdate(
            { _id: streamId },
            { $inc: { seq: 1 } },
            {
                upsert: true,
                returnDocument: 'after'
            }
        );
        if (!doc) {
            throw new Error(`Could not obtain sequence for stream=${streamId}`);
        }
        return doc.seq;
    }

    async appendToStream(streamId: string, events: IDomainEvent[]): Promise<void> {
        const toInsert = await Promise.all(
            events.map(async e => ({
                ...e,
                streamId,
                timestamp: new Date().toISOString(),
                sequence: await this.nextSequence(streamId),
            }))
        );
        await this.events.insertMany(toInsert);
    }

    async loadStream(streamId: string, from?: string): Promise<IStoredEvent[]> {
        const filter: any = { streamId };
        if (from) filter.sequence = { $gt: Number(from) };
        return this.events.find(filter).sort({ sequence: 1 }).toArray();
    }

    async loadAllEvents(from?: string): Promise<IStoredEvent[]> {
        const filter: any = {};
        if (from) filter.sequence = { $gt: Number(from) };
        return this.events.find(filter).sort({ sequence: 1 }).toArray();
    }
}
