# CQRS-ES Shop System (MVP)

A minimal, hexagonal-architecture example showcasing CQRS and Event Sourcing for an order & projection platform.

### Domain
- Defines aggregates & domain events
- Pure business rules, no infra dependencies

### Application
- Command handler loads aggregates, applies commands
- Persists via `IEventStore`, publishes via `IBroker`

### Infrastructure
- Adapters for RabbitMQ (shared/broker), Mongo, HTTP
- Event-store service journals domain events (append-only)
- Projection service rehydrates on startup and tails live events

> This keeps core logic clean, testable, and ready to swap any backing technology.

## Development

```bash
npm run up
```

## How It Works

### Core Concepts
- **Commands (write intent):** Requests to change state, validated by **Aggregates**.
- **Aggregates:** Enforce invariants and emit **Domain Events**; never mutate shared state directly.
- **Events (facts):** Immutable, append-only; the source of truth.

### Streams & Ordering
- **Stream (per aggregate):** Each aggregate has a `streamId` (**string**). Its events are appended to that stream in order (causal history).
- **Global sequence:** Every stored event also gets a system-wide, monotonically increasing **`sequence`**. This provides a single, total order across all streams for consumers.

### Read/Write Separation
- **Write model (Domain):** Commands → Aggregates → Events (correctness & invariants).
- **Read model (Reflection/Projection):** Consumes events and **denormalizes** them into query-optimized views. No decisions—only derivation from events.

### Projection Mechanics
- **Idempotence:** Projections must tolerate replays; use upserts and deterministic mappings.
- **High-watermark:** Each projector stores the last fully applied global `sequence` and resumes from the next one on restart.
- **Batching (pagination):** Projections read the global feed **in pages** (N events per call). Batching is a transport concern only; semantics remain identical. Always apply events **in ascending `sequence`**, then advance the checkpoint.

### Consistency & Concurrency
- **Eventual consistency:** Read models converge after consuming new events.
- **Optimistic concurrency (optional):** May be enforced with expected stream versions during append; otherwise rely on serialized command handling.
- **Immutability:** Corrections create new events; history is never rewritten.

### Extending & Swapping

- **Persistence:** Provide a Postgres/Mongo `IEventStore` implementation (library or service).
- **Broker:** Swap RabbitMQ for Kafka by implementing `IBroker`.
- **Read models:** Add projection services that subscribe only to relevant event types (routing keys).
- **Resilience:** Projectors (re)hydrate by calling the event store’s global feed with `from` and an optional `limit` (pagination), apply in order, and advance the **high-watermark**.

> Keep domain & application layers pure; let adapters handle all technical plumbing.

## C4 Architectural visualization (Structurizr)

Generate a 1:1 C4 diagram from the actual `docker-compose.yml`:
```bash
npm run viz
```
