import express from 'express';
import http from 'http';
import { MongoClient } from 'mongodb';
import { IDomainEvent, ICounterDoc, IStoredEvent } from '@daveloper/interfaces';
import { MongoEventStore } from '@daveloper/eventstore';
import { startMetricsServer } from '@daveloper/opentelemetry';

async function bootstrap() {
    // expose Prometheus /metrics for this container
    startMetricsServer(Number(process.env.OTEL_METRICS_PORT) || 9100);

    // MongoDB connection
    const mongoUrl = process.env.MONGO_URL!;
    const client = new MongoClient(mongoUrl);
    await client.connect();

    // EventStore setup
    const db = client.db(process.env.MONGO_DB_NAME || 'eventstore');
    const eventsColl = db.collection<IStoredEvent>(process.env.MONGO_EVENTS_COLLECTION || 'events');
    const countersColl = db.collection<ICounterDoc>(process.env.MONGO_COUNTERS_COLLECTION || 'event_counters');
    const eventStore = new MongoEventStore(eventsColl, countersColl);

    // Express app setup
    const app = express();
    app.use(express.json());

    // Append events
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

    // Load single stream
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

    // Load all events
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
    app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
    const server = http.createServer(app);
    server.listen(Number(process.env.PORT) || 4001, () =>
        console.log('🚀 OrderApplicationService up'),
    );
}

bootstrap().catch(err => {
    console.error(err);
    process.exit(1);
});
