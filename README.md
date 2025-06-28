# Full MVP: CQRS Node.js + TS with Docker Compose

This project includes four services:

1. **RabbitMQ** (message broker)
2. **Command Service** (handles commands, aggregates)
3. **Projection Service** (consumes events, updates read-model)
4. **BFF Service** (HTTP API + SSE)
5. **Frontend** (static HTML client)

---
## Run

```bash
docker-compose up --build
```

- UI at `http://localhost:3000`
- BFF at `http://localhost:4000`
- RabbitMQ mgmt UI at `http://localhost:15672` (guest/guest)

---
## Automatic Visualization Script (Mermaid)

To generate a live diagram based on your actual `docker-compose.yml`, include a simple Node.js script in your project:
```bash
npm run visualize
```
You can render it with any Mermaid renderer, e.g.:
```bash
npx mmdc -i DIAGRAM.mmd -o DIAGRAM.svg
```