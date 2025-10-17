import amqp, { ChannelModel, Channel, ConsumeMessage } from 'amqplib';
import { IDomainEvent, TDomainEventUnion, TCommandUnion, IBroker, ICommandHandler } from '@daveloper/interfaces';
import { context, injectAmqpHeaders, startMsgSpan, endSpanOk, endSpanErr, extractAmqpContext, busOut, busIn, busE2E } from '@daveloper/opentelemetry';

/**
 * Support publishing domain events and subscribing handlers with routing key filters.
 */
export class RabbitMQBroker implements IBroker {
  private conn!: ChannelModel;
  private pubCh!: Channel;
  private subCh!: Channel;
  private cmdCh!: Channel;
  private readonly exchange = 'domain-events';

  constructor(private url: string) { }

  async init() {
    this.conn = await amqp.connect(this.url);
    this.pubCh = await this.conn.createChannel();
    this.subCh = await this.conn.createChannel();
    this.cmdCh = await this.conn.createChannel();

    // Ensure the exchange exists on both pub/sub channels
    for (const ch of [this.pubCh, this.subCh]) {
      await ch.assertExchange(this.exchange, 'topic', { durable: true });
    }
  }

  /**
  * Send a raw command or message to a specific queue.
  */
  async send<C extends TCommandUnion>(
    queueName: string,
    command: C
  ): Promise<void> {
    await this.cmdCh.assertQueue(queueName, { durable: true });

    const span = startMsgSpan('amqp send command', 'send', {
      'messaging.destination.name': queueName,
      'messaging.message.conversation_id': command.correlationId,
      'command.type': command.type,
    });

    try {
      const headers: Record<string, any> = {};
      // inject W3C headers into AMQP properties
      injectAmqpHeaders(headers);
      // include correlationId for non-OTel consumers
      headers['correlation-id'] = command.correlationId;
      headers['produced-ts'] = Date.now();
      // for E2E tracing, mark the start time
      busOut.inc({ kind: 'command', type: command.type });
      // publish with headers
      this.cmdCh.sendToQueue(
        queueName,
        Buffer.from(JSON.stringify(command)),
        { persistent: true, headers }
      );
      // mark success for this command type
      endSpanOk(span);
      console.log('📨 [broker-send] send command', command.type, 'queue=', queueName, 'corrId=', command.correlationId);
    } catch (err) {
      endSpanErr(span, err);
      throw err;
    }
  }

  /**
   * Publish a domain event to the exchange using the event type as the routing key.
   * Events go to a topic exchange ("domain-events") with routing keys (DomainEvent type).
   */
  async publish<E extends TDomainEventUnion>(evt: E): Promise<void> {
    const span = startMsgSpan('amqp publish event', 'publish', {
      'messaging.destination.name': this.exchange,
      'messaging.rabbitmq.routing_key': evt.type,
      'messaging.message.conversation_id': evt.correlationId,
      'event.type': evt.type,
    });

    try {
      const headers: Record<string, any> = {};
      // inject W3C headers into AMQP properties
      injectAmqpHeaders(headers);
      // include correlationId for non-OTel consumers
      headers['correlation-id'] = evt.correlationId;
      headers['produced-ts'] = Date.now();
      // for E2E tracing, mark the start time
      busOut.inc({ kind: 'event', type: evt.type });
      // publish with headers
      this.pubCh.publish(this.exchange, evt.type, Buffer.from(JSON.stringify(evt)), {
        persistent: true,
        headers,
      });
      // mark success for this event type
      endSpanOk(span);
      console.log('📨 [broker-publish] domain-event published', evt.type, 'corrId=', evt.correlationId);
    } catch (err) {
      endSpanErr(span, err);
      throw err;
    }
  }

  /**
   * Consume a command queue with a given handler.
   */
  async consumeQueue<C extends TCommandUnion>(
    queueName: string,
    handler: ICommandHandler<C>
  ) {
    await this.cmdCh.assertQueue(queueName, { durable: true });
    console.log(`🪡 [broker-queue] consuming command queue='${queueName}'`);

    await this.cmdCh.consume(
      queueName,
      async (msg: ConsumeMessage | null) => {
        if (!msg) return;
        const headers = (msg.properties && msg.properties.headers) || {};
        // Restore tracing context (traceparent/baggage) from AMQP headers
        const otelCtx = extractAmqpContext(headers);

        await context.with(otelCtx, async () => {
          // Start a consumer span right away (before parsing)
          const span = startMsgSpan('amqp consume command', 'consume', {
            'messaging.system': 'rabbitmq',
            'messaging.destination.name': queueName,
            'messaging.message.conversation_id': headers['correlation-id'],
          });

          let command: C;
          try {
            // parse and cast to our command type
            command = JSON.parse(msg.content.toString()) as C;

            // Enrich after parsing (safe even after span created)
            // @ts-ignore – command may carry these fields by convention
            if ((command as any)?.type) span.setAttribute('command.type', (command as any).type);
            // @ts-ignore – many of your commands carry correlationId
            if ((command as any)?.correlationId) {
              span.setAttribute('messaging.message.conversation_id', (command as any).correlationId);
            }
            // If we have a produced timestamp, record the E2E latency
            const producedTs = Number(headers['produced-ts']);
            if (!Number.isNaN(producedTs)) busE2E.observe(Date.now() - producedTs);
            busIn.inc({ kind: 'command', type: (command as any).type, ack: 'true' });
            console.log('📨 [broker-queue] received command on', queueName, (command as any).type);
            // now handler expects exactly the command shape C
            await handler(command);
            this.cmdCh.ack(msg);
            endSpanOk(span);
            console.log('✅ [broker-queue] ACK', queueName);
          } catch (err) {
            endSpanErr(span, err);
            // On parse or handler error, do not requeue
            this.cmdCh.nack(msg, false, false);
            // Try to extract command type for metrics/logs
            const what = (() => {
              try {
                const p = JSON.parse(msg.content.toString());
                return p?.type || 'unknown';
              } catch { return 'unknown'; }
            })();
            // mark failure for this command type
            busIn.inc({ kind: 'command', type: what, ack: 'false' });
            console.error('❌ [broker-queue] command handling failed on', queueName, what, err);
          }
        });
      }
    );
  }

  /**
   * Subscribe to domain events with optional routing key patterns.
   * Each consumer (projection, event-store, etc.) binds its own queue 
   * to get exactly the slice of the stream it needs.
   * Returns an unsubscribe function that cancels the consumer.
   */
  async subscribe<E extends IDomainEvent = IDomainEvent>(
    handler: (evt: E) => Promise<void>,
    {
      queue,
      durable = false,
      autoDelete = true,
      routingKeys = [] as E['type'][],
      exchange
    }: {
      queue?: string;
      durable?: boolean;
      exchange?: string;
      autoDelete?: boolean;
      routingKeys?: E['type'][]; // Tied to the event’s `type`
    } = {}
  ): Promise<() => Promise<void>> {
    // Assert a queue for this consumer
    const q = await this.subCh.assertQueue(queue || '', { exclusive: !queue, durable, autoDelete });
    console.log(`🪝 [broker-subscribe] declaring queue='${q.queue}', durable=${durable}, autoDelete=${autoDelete}`);
    // If no routing keys specified, use '#' to get all events
    const keys = routingKeys.length ? routingKeys : ['#'];
    const exch = exchange ?? this.exchange;
    for (const key of keys) {
      await this.subCh.bindQueue(q.queue, exch, key);
      console.log(`🔗 [broker-subscribe] bound queue='${q.queue}' -> exchange='${exch}' with routingKey='${key}'`);
    }
    // Limit unacked messages to 1 for easier load balancing
    await this.subCh.prefetch(1);
    // Start consuming
    const { consumerTag } = await this.subCh.consume(
      q.queue,
      async (msg: ConsumeMessage | null) => {
        if (!msg) return;
        const headers = (msg.properties && msg.properties.headers) || {};
        const routingKey = (msg.fields as any)?.routingKey;
        const otelCtx = extractAmqpContext(headers);
        // Restore tracing context (traceparent/baggage) from AMQP headers
        await context.with(otelCtx, async () => {
          const span = startMsgSpan('amqp consume event', 'consume', {
            'messaging.destination.name': q.queue,
            'messaging.rabbitmq.queue': q.queue,
            'messaging.rabbitmq.routing_key': routingKey,
            'messaging.message.conversation_id': headers['correlation-id'],
          });

          let eventType = 'unknown';
          try {
            const raw = msg.content.toString();
            const eventAny = JSON.parse(raw) as IDomainEvent;
            eventType = eventAny?.type ?? 'unknown';
            // Enrich span now that we know the event details
            if (eventAny?.type) span.setAttribute('event.type', eventAny.type);
            if (eventAny?.correlationId) {
              span.setAttribute('messaging.message.conversation_id', eventAny.correlationId);
            }
            // If we have a produced timestamp, record the E2E latency
            const producedTs = Number(headers['produced-ts']);
            if (!Number.isNaN(producedTs)) busE2E.observe(Date.now() - producedTs);
            busIn.inc({ kind: 'event', type: eventType, ack: 'true' });
            console.log('📨 [broker-subscribe] received event', eventAny.type, 'on queue=', q.queue);
            // cast to E before calling the handler
            await handler(eventAny as E);
            this.subCh.ack(msg);
            // mark success for this event type
            endSpanOk(span);
            console.log('✅ [broker-subscribe] ACK', eventAny.type);
          } catch (err) {
            // mark failure for this event type
            endSpanErr(span, err);
            this.subCh.nack(msg, false, false);
            // Try to extract event type for metrics/logs
            busIn.inc({ kind: 'event', type: eventType, ack: 'false' });
            console.error('❌ [broker-subscribe] handler failed', err);
          }
        });
      }
    );

    console.log(`🍽️ [broker-subscribe] consumer started, tag=${consumerTag}`);
    return async () => {
      console.log(`🛑 [broker-subscribe] canceling consumer tag=${consumerTag}`);
      await this.subCh.cancel(consumerTag);
    };
  }

  /**
   * Close all channels and the underlying connection.
   */
  async close() {
    await this.pubCh.close();
    await this.subCh.close();
    await this.cmdCh.close();
    await this.conn.close();
  }
}