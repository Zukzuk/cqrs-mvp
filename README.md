# CQRS-ES Shop System (MVP)

A minimal, **hexagonal-architecture** example showcasing **CQRS** (Command Query Responsibility Segregation) and **Event Sourcing** across multiple bounded contexts — _Order_ and _Calendar_ — each with their own event stores and message-based communication. The _Order_ domain also has a related projection - _Shop_.

## 🧰 Development

### Quick Start

```bash
npm run up
```
> Starts the full stack using Docker Compose (Order, Calendar, Shop, Broker, Observability)

### Visualize Architecture (C4)
```bash
npm run viz
```
> Generates live **Structurizr C4 diagrams** directly from `docker-compose.yml`.

## 📡  URLs

| Service | URL | Purpose |
|----------|-----|----------|
| Website | [http://localhost:3000](http://localhost:3000) | React App
| C4 View | [http://localhost:8000](http://localhost:8000) | Structurizr
| RabbitMQ UI | [http://localhost:4672](http://localhost:4672) | Broker management |
| Grafana | [http://localhost:8300](http://localhost:8300) | Dashboards |
| Prometheus | [http://localhost:8900](http://localhost:8900) | Metrics |
| Tempo | [http://localhost:8200](http://localhost:8200) | Traces |

## 🧩 Architecture Overview

### Domain Layer
- Defines **Aggregates** and **Domain Events**
- Contains **pure business logic** (no infra dependencies)
- Encapsulates validation and invariants through business rules

### Application Layer
- Command handlers **load aggregates**, apply commands, and emit new events
- Uses `IEventStore` for persistence and `IBroker` for publishing domain events

### Infrastructure Layer
- Provides adapters for:
  - **RabbitMQ** (`shared/broker`) for message transport
  - **MongoDB** (`shared/eventstore`) for event persistence
  - **HTTP** APIs for the EventStore service interface
- Adds **observability** with Prometheus & OpenTelemetry instrumentation

This separation keeps all domain logic **pure, testable, and technology-agnostic**.

## 🧱 Core Concepts

| Concept | Description |
|----------|--------------|
| **Command** | Expresses an intent to change system state (validated by aggregates) |
| **Aggregate** | Enforces business invariants, applies commands, and emits domain events |
| **Event** | Immutable, factual record of what has happened |
| **Stream** | Sequence of all events for a specific aggregate |
| **Global sequence** | Monotonically increasing order across all streams, used for projections |
| **Projection** | Consumes events to build read-optimized views; deterministic and idempotent |

## ⚙️ Mechanics

### Streams & Ordering
- Each aggregate has its own stream (`streamId`)
- Events are appended in causal order
- A global sequence ensures a total order for consumers

### Read/Write Separation
- **Write model** → Commands → Aggregates → Events (ensures correctness)
- **Read model** → Consumes events → Denormalized query models (ensures performance)

### Projection Behavior
- **Idempotent:** must handle replay and reprocessing
- **Checkpointed:** each projector tracks a `high-watermark` sequence
- **Batch-consistent:** always applies in strict ascending order

### Consistency & Concurrency
- **Eventual consistency** between write and read models
- **Optimistic concurrency** via expected version or serialized commands
- **Immutability:** no rewriting of history; corrections create new events

## 🧠 Domains

### 🧾 Orders
- Domain Aggregate: `Order`
- Commands: Create, Ship
- Events: Created, Shipped (+ Failed variants)
- EventStore: MongoDB-backed, append-only

### 🗓️ Calendar
- Domain Aggregate: `Calendar`
- Commands: Create, Schedule, Reschedule, Remove
- Events: CalendarCreated, TimeslotScheduled, etc.
- EventStore: MongoDB-backed, append-only

## 🪞 Projections

### 🛒 Shop
- **BFF Service:** gateway between frontend and backend (WebSocket + REST)
- **Projection Service:** tails domain events and updates the read model
- **Frontend SPA:** browser client communicating over WebSocket

## 📊 Observability
- **OpenTelemetry SDK** auto-instrumented across all Node.js services
- Exports:
  - **Traces:** to Grafana Tempo
  - **Metrics:** to Prometheus
  - **Dashboards:** via Grafana
- Exposes `/metrics` endpoint on each service (default port: `9100`)

## 🧾 Available npm Scripts

| Script | Description |
|---------|-------------|
| `npm run build` | Build all shared and service workspaces |
| `npm run up` | Bring up the full Docker stack (CQRS + ES + Observability) |
| `npm run down` | Stop and remove containers |
| `npm run viz` | Generate Structurizr C4 architecture visualization |
| `npm run lint` | Run linting across all packages (if configured) |
| `npm run clean` | Remove build artifacts |
| `npm run test` | Run unit tests across workspaces (optional placeholder) |

> Each service (Order, Calendar, Shop, etc.) also supports individual `npm run build` and `npm start` commands within its own workspace.

## 🧭 Extending & Swapping

| Component | Replaceable With | Interface |
|------------|------------------|------------|
| Event Store | Postgres, DynamoDB, EventStoreDB | `IEventStore` |
| Broker | Kafka, NATS, Azure Service Bus | `IBroker` |
| Observability | Datadog, New Relic | OpenTelemetry SDK |
| Read Models | Custom projections | Domain event subscription |

All technology details are confined to the **infrastructure layer**, allowing you to evolve implementation freely without touching domain logic.

---

© 2025 — CQRS-ES Shop MVP by Daveloper
