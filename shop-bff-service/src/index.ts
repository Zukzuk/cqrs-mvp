import express from 'express';
import cors from 'cors';
import amqp from 'amqplib';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

(async () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Load OpenAPI spec
  const spec = YAML.load(path.join(__dirname, '../openapi.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));

  const conn = await amqp.connect(process.env.RABBITMQ_URL!);
  const cmdCh = await conn.createChannel();
  const evtCh = await conn.createChannel();
  await cmdCh.assertQueue('commands');
  await evtCh.assertQueue('events');

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
    await cmdCh.sendToQueue('commands', Buffer.from(JSON.stringify(req.body)));
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
  app.get('/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });
    evtCh.consume('events', msg => {
      if (msg) {
        res.write(`data: ${msg.content.toString()}`);
        evtCh.ack(msg);
      }
    });
  });

  app.listen(4000, () => console.log('BFF up on 4000 with Swagger UI at /api-docs'));
})();