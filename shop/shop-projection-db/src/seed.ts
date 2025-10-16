import { MongoClient } from 'mongodb';
import fetch from 'node-fetch';
import { IShopView, IStoredEvent } from '@daveloper/interfaces';
import { mapOrderCreated, mapOrderShipped } from '@daveloper/denormalizers';

interface ProjectionMeta {
  _id: string;
  lastSequence: number;
}

const MONGO_URL = process.env.MONGO_URL!;
const EVENTSTORE_URL = process.env.EVENTSTORE_URL!;
const DB_NAME = 'shop_projection';
// The document _id under projection_meta that tracks this projection’s cursor
const PROJECTION_META_ID = 'shop-orders';

async function seed() {
  console.log('🟡 [shop-projection-seeder] connecting to Mongo…');
  const client = new MongoClient(MONGO_URL);
  await client.connect();

  const db = client.db(DB_NAME);
  const orders = db.collection<IShopView>('orders');
  const metaCol = db.collection<ProjectionMeta>('projection_meta');

  // load or initialize cursor for our "shop-orders" projection
  const meta = await metaCol.findOne({ _id: PROJECTION_META_ID });
  let cursor = meta?.lastSequence ?? 0;
  console.log(`🟡 [shop-projection-seeder] starting from sequence=${cursor}`);

  while (true) {
    const url = `${EVENTSTORE_URL}/events?from=${cursor}&limit=100`;
    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.text();
      console.error(`❌ [shop-projection-seeder] fetch ${res.status}:`, body);
      throw new Error(`Fetch failed: ${res.status}`);
    }

    const batch = (await res.json()) as IStoredEvent[];
    if (batch.length === 0) {
      console.log('🟢 [shop-projection-seeder] no new events');
      break;
    }

    console.log(`🟡 [shop-projection-seeder] got ${batch.length} events; first seq=${batch[0].sequence}`);

    for (const evt of batch) {
      let view = undefined;
      if (evt.type === 'OrderCreated') view = mapOrderCreated(evt);
      if (evt.type === 'OrderShipped') view = mapOrderShipped(evt);
      if (view) {
        await orders.updateOne(
          { orderId: view.orderId },
          { $set: view },
          { upsert: true }
        );
      }
      cursor = evt.sequence;
    }

    // persist updated cursor under our explicit projection ID
    await metaCol.updateOne(
      { _id: PROJECTION_META_ID },
      { $set: { lastSequence: cursor } },
      { upsert: true }
    );
    console.log(`✅ [shop-projection-seeder] applied up to sequence=${cursor}`);
  }

  await client.close();
  console.log(`🟢 [shop-projection-seeder] complete (final sequence=${cursor})`);
}

seed().catch(err => {
  console.error('❌ [shop-projection-seeder] error', err);
  process.exit(1);
});
