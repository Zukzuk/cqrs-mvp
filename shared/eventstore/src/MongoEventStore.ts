import { Collection, FindOneAndUpdateOptions } from 'mongodb';
import { IDomainEvent, IStoredEvent, ICounterDoc } from '@daveloper/interfaces';

export class MongoEventStore {
    constructor(
        private events: Collection<IStoredEvent>,
        private counters: Collection<ICounterDoc>
    ) {
        // simple, stable, non-unique indexes
        void this.events.createIndex({ sequence: 1 }, { name: "events_sequence" });
        void this.events.createIndex({ streamId: 1, sequence: 1 }, { name: "events_stream_seq" });
    }

    // GLOBAL high-watermark (not per stream)
    private async nextGlobalSequence(): Promise<number> {
        // https://www.mongodb.com/docs/manual/tutorial/create-an-auto-incrementing-field/
        const opts: FindOneAndUpdateOptions = {
            upsert: true,
            returnDocument: 'after',
        };
        // Same shape as your working nextSequence, just with the fixed _id
        // See https://mongodb.github.io/node-mongodb-native/4.0/classes/Collection.html#findOneAndUpdate
        const r = await this.counters.findOneAndUpdate(
            { _id: "__global_sequence__" },
            { $inc: { seq: 1 } },
            opts
        );
        // MongoDB Node.js Driver v4+ returns the full result object, not just the doc
        const doc: any = (r && typeof (r as any).value !== 'undefined') ? (r as any).value : r;
        if (!doc || typeof doc.seq !== 'number') {
            throw new Error('Could not obtain global sequence');
        }
        return doc.seq;
    }

    async appendToStream(streamId: string, events: IDomainEvent[]): Promise<void> {
        const toInsert: IStoredEvent[] = [];
        for (const e of events) {
            toInsert.push({
                ...e,
                streamId,
                timestamp: new Date().toISOString(),
                sequence: await this.nextGlobalSequence(),
            } as any);
        }
        await this.events.insertMany(toInsert);
    }

    async loadStream(streamId: string, from?: string): Promise<IStoredEvent[]> {
        const filter: Record<string, any> = { streamId };
        if (from) filter.sequence = { $gt: Number(from) };
        return this.events.find(filter).sort({ sequence: 1 }).toArray();
    }

    async loadAllEvents(from?: string, limit?: number): Promise<IStoredEvent[]> {
        const filter: Record<string, any> = {};
        if (from) {
            const n = Number(from);
            if (!Number.isNaN(n)) filter.sequence = { $gt: n };
        }
        const cursor = this.events.find(filter).sort({ sequence: 1 });
        if (limit && limit > 0) cursor.limit(limit);
        return cursor.toArray();
    }
}
