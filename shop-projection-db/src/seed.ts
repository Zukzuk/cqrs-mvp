import { MongoClient } from 'mongodb';
import fetch from 'node-fetch';
import { IDomainEvent, IShopView } from '@daveloper/interfaces';

interface ProjectionMeta {
    _id: string;
    lastSequence: number;
}

// Extend the shared IDomainEvent with sequence metadata from the event-store
interface StoredEvent extends IDomainEvent {
    sequence: number;
}

const MONGO_URL = process.env.MONGO_URL!;
const EVENTSTORE_URL = process.env.EVENTSTORE_URL!;
const DB_NAME = 'shop_projection';

async function seed() {
    console.log('🟡 [seeder] connecting to Mongo…');
    const client = new MongoClient(MONGO_URL);
    await client.connect();

    const db = client.db(DB_NAME);
    const orders = db.collection('orders');
    const metaCol = db.collection<ProjectionMeta>('projection_meta');

    // upsert helper
    const saveView = async (view: IShopView) => {
        await orders.updateOne(
            { orderId: view.orderId },
            { $set: view },
            { upsert: true }
        );
    };

    // stub out socket.emit with correct signature
    const emit = (_event: string, _payload: any): void => { };

    // load or initialize cursor
    const meta = await metaCol.findOne({ _id: 'shop-orders' });
    let cursor = meta?.lastSequence ?? 0;
    console.log(`🟡 [seeder] starting from sequence=${cursor}`);

    // replay in pages
    while (true) {
        const res = await fetch(
            `${EVENTSTORE_URL}/events?stream=Order&from=${cursor}&limit=100`
        );
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

        // parse JSON into our StoredEvent type
        const batch = (await res.json()) as StoredEvent[];
        if (batch.length === 0) break;

        for (const evt of batch) {
            if (evt.type === 'OrderCreated') {
                // evt.payload corresponds to OrderCreated payload shape
                const { orderId, userId, total } = evt.payload as { orderId: string; userId: string; total: number };
                await saveView({
                    orderId,
                    userId,
                    total,
                    status: 'CREATED',
                    correlationId: evt.correlationId,
                });
                emit('order_update', { orderId, userId, total, status: 'CREATED', correlationId: evt.correlationId });
            }
            // advance cursor to latest sequence
            cursor = evt.sequence;
        }

        // persist updated cursor
        await metaCol.updateOne(
            { _id: 'shop-orders' },
            { $set: { lastSequence: cursor } },
            { upsert: true }
        );
        console.log(`✅ [seeder] applied up to ${cursor}`);
    }

    console.log(`🟢 [seeder] complete (final sequence=${cursor})`);
    await client.close();
}

seed().catch(err => {
    console.error('❌ [seeder] error', err);
    process.exit(1);
});
