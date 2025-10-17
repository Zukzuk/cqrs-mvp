import express from 'express';
import { MongoClient } from 'mongodb';
import { IDomainEvent, ICounterDoc, IStoredEvent } from '@daveloper/interfaces';
import { MongoEventStore } from '@daveloper/eventstore';
import { startMetricsServer } from '@daveloper/opentelemetry';

async function bootstrap() {
    // Expose Prometheus /metrics for this container (separate port from order service)
    startMetricsServer(Number(process.env.OTEL_METRICS_PORT) || 9102);

    // MongoDB connection
    const mongoUrl = process.env.MONGO_URL!; // e.g. mongodb://calendar-eventstore-db:27017
    const client = new MongoClient(mongoUrl);
    await client.connect();

    // EventStore setup
    const db = client.db(process.env.MONGO_DB_NAME || 'calendar_eventstore');
    const eventsColl = db.collection<IStoredEvent>(process.env.MONGO_EVENTS_COLLECTION || 'events');
    const countersColl = db.collection<ICounterDoc>(process.env.MONGO_COUNTERS_COLLECTION || 'event_counters');
    const eventStore = new MongoEventStore(eventsColl, countersColl);

    // Express app
    const app = express();
    app.use(express.json());

    // Health check
    app.get('/health', (_req, res) => res.json({ status: 'ok' }));

    // Append events to a stream
    app.post('/streams/:streamId/events', async (req, res) => {
        const { streamId } = req.params;
        const events: IDomainEvent[] = req.body;

        if (!Array.isArray(events)) {
            return res.status(400).json({ error: 'Body must be an array of IDomainEvent' });
        }

        try {
            await eventStore.appendToStream(streamId, events);
            res.status(201).json({ appended: events.length });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to append events' });
        }
    });

    // Load a single stream (optionally from position)
    app.get('/streams/:streamId/events', async (req, res) => {
        const { streamId } = req.params;
        const from = req.query.from as string | undefined;

        try {
            const events = await eventStore.loadStream(streamId, from);
            res.json(events);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to load stream' });
        }
    });

    // Load all events (optionally from global position)
    app.get('/events', async (req, res) => {
        const from = req.query.from as string | undefined;
        const limit = req.query.limit ? Number(req.query.limit) : undefined;

        try {
            const events = await eventStore.loadAllEvents(from, limit);
            res.json(events);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to load events' });
        }
    });

    // Start server
    const port = process.env.PORT! || 4011;
    app.listen(port, () => console.log('🚀 CalendarEventstoreService up'));
}

bootstrap().catch(err => {
    console.error(err);
    process.exit(1);
});