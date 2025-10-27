import { Collection, MongoClient } from 'mongodb';
import fetch from 'node-fetch';
import { ShopOrdersDocument, IStoredEvent } from '@daveloper/interfaces';
import { projectOrderEvent } from '@daveloper/denormalizers';

interface ProjectionMeta {
  _id: string;
  lastSequence: number;
}

const MONGO_URL = process.env.MONGO_URL!;
const EVENTSTORE_URL = process.env.EVENTSTORE_URL!;
const DB_NAME = 'shop_projection';
// The document _id under projection_meta that tracks this projection’s cursor
const PROJECTION_META_ID = 'shop-orders';

// Establish MongoDB connection and get collections
async function init(): Promise<{
  client: MongoClient;
  ordersColl: Collection<ShopOrdersDocument>;
  metaColl: Collection<ProjectionMeta>;
  metaId: ProjectionMeta | null;
}> {
  console.log('🟡 [shop-projection-seeder] connecting to Mongo…');
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db(DB_NAME);
  const ordersColl = db.collection<ShopOrdersDocument>('orders');
  const metaColl = db.collection<ProjectionMeta>('projection_meta');
  // load or initialize cursor for our "shop-orders" projection
  const metaId = await metaColl.findOne({ _id: PROJECTION_META_ID });
  return { client, ordersColl, metaColl, metaId };
}

// Fetch a batch of events from the event store starting from the given cursor
async function getBatch(cursor: number): Promise<{ batch: IStoredEvent[] }> {
  const url = `${EVENTSTORE_URL}/events?from=${cursor}&limit=100`;
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text();
    console.error(`❌ [shop-projection-seeder] fetch ${res.status}:`, body);
    throw new Error(`Fetch failed: ${res.status}`);
  }

  const batch = (await res.json()) as IStoredEvent[];
  return { batch };
}

// Persist the projected order view to MongoDB
async function persistOrder(
  ordersColl: Collection<ShopOrdersDocument>,
  view: ShopOrdersDocument
): Promise<void> {
  // upsert the projected order view
  await ordersColl.updateOne(
    { orderId: view.orderId },
    { $set: view },
    { upsert: true }
  );
}

// Persist the highwatermark cursor to MongoDB
async function persistHighwatermark(
  metaColl: Collection<ProjectionMeta>,
  cursor: number
): Promise<void> {
  // persist highwatermark cursor under our explicit projection ID
  await metaColl.updateOne(
    { _id: PROJECTION_META_ID },
    { $set: { lastSequence: cursor } },
    { upsert: true }
  );
}

// Main seeding function
async function seed() {
  const { client, ordersColl, metaColl, metaId } = await init();
  let cursor = metaId ? metaId.lastSequence : 0;
  console.log(`🟡 [shop-projection-seeder] starting from sequence=${cursor}`);

  // Process events in batches until there are no new events
  while (true) {
    const { batch } = await getBatch(cursor);

    if (batch.length === 0) {
      console.log('🟢 [shop-projection-seeder] no new events');
      break;
    }
    console.log(`🟡 [shop-projection-seeder] got ${batch.length} events; first seq=${batch[0].sequence}`);

    // Process each event in the batch
    for (const evt of batch) {
      const view = projectOrderEvent(evt);
      if (!view) {
        cursor = evt.sequence;
        continue;
      }

      await persistOrder(ordersColl, view);
      cursor = evt.sequence;
    }

    await persistHighwatermark(metaColl, cursor)
    console.log(`✅ [shop-projection-seeder] applied up to sequence=${cursor}`);
  }

  await client.close();
  console.log(`🟢 [shop-projection-seeder] complete (final sequence=${cursor})`);
}

seed().catch(err => {
  console.error('❌ [shop-projection-seeder] error', err);
  process.exit(1);
});
