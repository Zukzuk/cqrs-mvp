// metrics.ts
import { Counter, Histogram, register } from 'prom-client';
import http from 'http';

export const busOut = new Counter({
    name: 'bus_messages_out_total',
    help: 'Messages produced to the bus',
    labelNames: ['kind', 'type'],
});

export const busIn = new Counter({
    name: 'bus_messages_in_total',
    help: 'Messages consumed from the bus',
    labelNames: ['kind', 'type', 'ack'],
});

export const busE2E = new Histogram({
    name: 'bus_e2e_latency_ms',
    help: 'End-to-end latency from producer to consumer (ms)',
    buckets: [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000],
});

// IMPORTANT: expose the *global* register
export function startMetricsServer(port = Number(process.env.OTEL_METRICS_PORT ?? 9100)) {
    const server = http.createServer(async (req, res) => {
        if (req.url === '/metrics') {
            res.setHeader('Content-Type', register.contentType);
            res.end(await register.metrics());
        } else {
            res.statusCode = 200;
            res.end('ok');
        }
    });
    server.listen(port, () => console.log(`[metrics] listening on :${port}`));
}
