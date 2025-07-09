# CQRS-ES Shop System (MVP)

A minimal, hexagonal-architecture example showcasing CQRS and Event Sourcing for an order & projection platform.

## Domain:

Defines Order aggregate & DomainEvent types

Pure business rules, no infra dependencies

## Application:

CommandHandler loads aggregates, applies commands,
persists via IEventStore, publishes to RabbitMQ

## Infrastructure:

Adapters for RabbitMQ (shared/eventbus), Mongo, HTTP

event-store service subscribes to all domain-events and journals them in memory (or later a real DB)

shop-projection-service rehydrates from event-store on startup and tails live events

### This keeps your core logic clean, testable, and ready to swap any backing technology.

---
## Run

```bash
npm run start:all
```

---
## C4 Arhitectural visualization (Structurizr))

Generate a 1to1 C4 diagram based on the actual `docker-compose.yml`
```bash
npm run dsl
```

Inspect it with Structurizr UI
```bash
npm run visualize
```

## Extending & Swapping

Persistence: drop in a Postgres/Mongo-based IEventStore in event-store/ or as a library.

Broker: swap RabbitMQ for Kafka by implementing the same IEventBus interface.

Read Model: add new projection services binding only to the events they care about (routingKeys).

Snapshots: have projection services call GET /events?from=<timestamp> on the Event Store to catch up after restarts.

This setup keeps your domain & application layers pure, with all technical “plumbing” living in infrastructure adapters—making your core logic clean, testable, and ready to swap any backing technology.