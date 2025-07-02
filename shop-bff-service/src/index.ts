import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { RabbitMQEventBus, IDomainEvent } from '@daveloper/eventbus';

(async () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Load OpenAPI spec
  const spec = YAML.load(path.join(__dirname, '../openapi.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));

  // 1) Initialize the EventBus (hides amqp.connect, channels, queues/exchange)
  const bus = new RabbitMQEventBus(process.env.RABBITMQ_URL!);
  await bus.init();

  /**
   * @openapi
   * /commands:
   *   post:
   *     summary: Send a command
   *     responses:
   *       202:
   *         description: Accepted
   */
  app.post('/commands', async (req, res) => {
    // 2) Send straight through the façade—no raw amqp here
    await bus.send('commands', req.body);
    res.sendStatus(202);
  });

  /**
   * @openapi
   * /events:
   *   get:
   *     summary: SSE for events
   *     responses:
   *       200:
   *         description: Event stream
   */
  app.get('/events', async (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
    });

    // 3) Subscribe to *all* domain events; returns an unsubscribe fn
    const unsubscribe = await bus.subscribe(
      async (evt: IDomainEvent) => {
        // SSE framing: data + double newline
        res.write(`data: ${JSON.stringify(evt)}\n\n`);
      }
      // no type filters → receive everything
    );

    // 4) Cleanup when client disconnects
    req.on('close', () => {
      unsubscribe().catch(console.error);
    });
  });

  app.listen(4000, () =>
    console.log('BFF up on 4000 with Swagger UI at /api-docs')
  );
})();
