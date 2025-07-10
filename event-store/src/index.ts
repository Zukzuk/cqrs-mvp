import express from 'express';

import { RabbitMQBroker, IDomainEvent } from '@daveloper/broker';

interface StoredEvent extends IDomainEvent {
  timestamp: string;
}

interface IEventStore {
  appendToStream(streamId: string, events: IDomainEvent[]): Promise<void>;
  loadStream(streamId: string, from?: string): Promise<StoredEvent[]>;
  loadAllEvents(from?: string): Promise<StoredEvent[]>;
}

class InMemoryEventStore implements IEventStore {
  private store: Record<string, StoredEvent[]> = {};

  async appendToStream(streamId: string, events: IDomainEvent[]): Promise<void> {
    const stamped = events.map(e => ({
      ...e,
      timestamp: new Date().toISOString(),
    }));
    this.store[streamId] = [
      ...(this.store[streamId] || []),
      ...stamped,
    ];
    console.log(`💾 [event-store] appended ${stamped.length} event(s) to stream=${streamId}`);
  }

  async loadStream(streamId: string, from?: string): Promise<StoredEvent[]> {
    let events = [...(this.store[streamId] || [])];
    if (from) {
      const since = new Date(from);
      events = events.filter(e => new Date(e.timestamp) > since);
    }
    return events;
  }

  async loadAllEvents(from?: string): Promise<StoredEvent[]> {
    let events = Object.values(this.store).flat();
    if (from) {
      const since = new Date(from);
      events = events.filter(e => new Date(e.timestamp) > since);
    }
    return events;
  }
}

async function startEventStore() {
  const eventStore = new InMemoryEventStore();

  const bus = new RabbitMQBroker(process.env.RABBITMQ_URL!);
  await bus.init();
  console.log('🟢 [event-store-bus] initialized');

  /*
   * Events go to a topic exchange (domain-events) with routing keys, 
   * and each consumer (projection, event-store, etc.) binds its own queue 
   * (often with ['#'] or a narrower set of keys) to get exactly the slice 
   * of the stream it needs.
   */
  await bus.subscribe(
    async (evt: IDomainEvent) => {
      console.log('📨 [event-store-bus] receiving event', evt.type);
      const streamId = (evt.payload.orderId || 'global') as string;
      await eventStore.appendToStream(streamId, [evt]);
    },
    {
      queue: 'event-store-q', // Declare a queue
      exchange: 'domain-events', // Bind it to the "domain-events" exchange 
      routingKeys: ['#'], // use binding key "#" (the wildcard that matches all routing keys)
      durable: true, // Ensure the queue is durable
      autoDelete: false, // Do not auto-delete the queue when no consumers are connected
    }
  );
  console.log('🔗 [event-store-bus] subscribed to domain-events');

  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Optional HTTP append
  app.post('/streams/:streamId/events', async (req, res) => {
    const { streamId } = req.params;
    const events: IDomainEvent[] = req.body;
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Body must be an array of IDomainEvent' });
    }
    await eventStore.appendToStream(streamId, events);
    res.status(201).json({ appended: events.length });
  });

  // Load a single stream
  app.get('/streams/:streamId/events', async (req, res) => {
    const { streamId } = req.params;
    const from = req.query.from as string | undefined;
    const events = await eventStore.loadStream(streamId, from);
    res.json(events);
  });

  // Load all events
  app.get('/events', async (req, res) => {
    const from = req.query.from as string | undefined;
    const events = await eventStore.loadAllEvents(from);
    res.json(events);
  });

  const port = Number(process.env.PORT) || 7000;
  app.listen(port, () => console.log(`🚀 EventStore listening on port ${port}`));
}

startEventStore().catch(err => {
  console.error('❌ EventStore failed to start', err);
  process.exit(1);
});