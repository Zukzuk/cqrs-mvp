import amqp, { ChannelModel, Channel, ConsumeMessage } from 'amqplib';
import { IDomainEvent, TDomainEventUnion, TCommandUnion, IBroker, ICommandHandler, PublishOptions, MessageMeta } from '@daveloper/interfaces';
import { injectHeaders, startProducerSpan, withExtractedContext, startConsumerSpan } from '@daveloper/opentelemetry';

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

  /**
   * Declares topic exchanges for publishing and subscribing.
   */
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
   * Publish a domain event to the exchange using the event type as the routing key.
   * Events go to a topic exchange (domain-events) with routing keys.
   */
  async publish<E extends TDomainEventUnion>(evt: E, opts: PublishOptions = {}): Promise<void> {
    const span = startProducerSpan('event', this.exchange, evt.type, {
      'event.name': evt.type,
      ...(evt.correlationId ? { 'correlation.id': evt.correlationId } : {}),
    });
    
    console.log(span)

    const payload = Buffer.from(JSON.stringify(evt));
    const { headers, persistent = true } = injectHeaders(opts);

    try {
      const payload = Buffer.from(JSON.stringify(evt));
      const { headers, persistent = true } = injectHeaders(opts);
      const ok = this.pubCh.publish(
        this.exchange,  // e.g. 'domain-events'
        evt.type,       // routing key (must be one of your DomainEvent types)
        payload, { headers, persistent }
      );
      if (!ok) await new Promise<void>(r => setImmediate(r));
      console.log('📤 [broker-publish] published', evt.type, 'corrId=', evt.correlationId);
    } catch (e) {
      span?.recordException(e as Error);
      throw e;
    } finally {
      span?.end();
    }
  }

  /**
   * Subscribe to domain events with optional routing key patterns.
   * Each consumer (projection, event-store, etc.) binds its own queue to get exactly the slice of the stream it needs.
   * Returns an unsubscribe function that cancels the consumer.
   */
  async subscribe<E extends IDomainEvent = IDomainEvent>(
    handler: (evt: E, meta?: MessageMeta) => Promise<void>,
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
    const q = await this.subCh.assertQueue(queue || '', { exclusive: !queue, durable, autoDelete });
    console.log(`🪝 [broker-subscribe] declaring queue='${q.queue}', durable=${durable}, autoDelete=${autoDelete}`);

    const keys = routingKeys.length ? routingKeys : ['#'];
    const exch = exchange ?? this.exchange;
    for (const key of keys) {
      await this.subCh.bindQueue(q.queue, exch, key);
      console.log(`🔗 [broker-subscribe] bound queue='${q.queue}' -> exchange='${exch}' with routingKey='${key}'`);
    }

    await this.subCh.prefetch(1);

    const { consumerTag } = await this.subCh.consume(
      q.queue,
      async (msg: ConsumeMessage | null) => {
        if (!msg) return;
        const raw = msg.content;
        const eventAny = JSON.parse(raw.toString()) as IDomainEvent;
        const meta: MessageMeta = {
          headers: msg.properties?.headers,
          routingKey: msg.fields.routingKey,
          exchange: exch,
          deliveryTag: msg.fields.deliveryTag,
          raw,
        };

        console.log('📨 [broker-subscribe] received event', eventAny.type, 'on queue=', q.queue);

        await withExtractedContext(meta.headers, async () => {
          const evt = JSON.parse(raw.toString()) as E;
          const span = startConsumerSpan(q.queue, meta.routingKey, {
            'event.name': (evt as any).type,
            ...(evt as any).correlationId ? { 'correlation.id': (evt as any).correlationId } : {},
          });

          try {
            await handler(evt, meta);
            this.subCh.ack(msg);
            console.log('✅ [broker-subscribe] ACK', eventAny.type);
          }
          catch (err) {
            span?.recordException(err as Error);
            console.error('❌ [broker-subscribe] handler failed for', eventAny.type, err);
            this.subCh.nack(msg, false, false);
          }
          finally {
            span?.end();
          }
        });
      }
    );

    console.log(`🚀 [broker-subscribe] consumer started, tag=${consumerTag}`);
    return async () => {
      console.log(`🛑 [broker-subscribe] canceling consumer tag=${consumerTag}`);
      await this.subCh.cancel(consumerTag);
    };
  }

  /**
   * Send a raw command or message to a specific queue.
   */
  async send<C extends TCommandUnion>(
    queueName: string,
    command: C,
    opts: PublishOptions = {},
  ): Promise<void> {
    await this.cmdCh.assertQueue(queueName, { durable: true });
    const span = startProducerSpan('command', queueName, queueName, {
      'command.name': command.type,
      ...(command.correlationId ? { 'correlation.id': command.correlationId } : {}),
    });

    try {
      const body = Buffer.from(JSON.stringify(command));
      const { headers, persistent = true } = injectHeaders(opts);
      this.cmdCh.sendToQueue(queueName, body, { headers, persistent });
      console.log('📨 [broker-send] sent command', command.type, 'to queue=', queueName, 'corrId=', command.correlationId);
    } catch (e) {
      span?.recordException(e as Error);
      throw e;
    } finally {
      span?.end();
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

        const raw = msg.content;

        const meta: MessageMeta = {
          headers: msg.properties?.headers,
          routingKey: msg.fields.routingKey,
          exchange: queueName,
          deliveryTag: msg.fields.deliveryTag,
          raw: msg.content,
        };

        await withExtractedContext(meta.headers, async () => {
          let command: C;
          try {
            command = JSON.parse(raw.toString()) as C;
          }
          catch (err) {
            console.error('❌ [broker-queue] failed to parse command', queueName, err);
            // cannot ack malformed message, so nack without requeue
            this.cmdCh.nack(msg, false, false);
            return;
          }

          const span = startConsumerSpan(queueName, meta.routingKey, {
            'command.name': (command as any).type,
            ...(command as any).correlationId ? { 'correlation.id': (command as any).correlationId } : {},
          });

          console.log('📨 [broker-queue] received command on', queueName, command.type);

          try {
            await handler(command, meta);
            this.cmdCh.ack(msg);
            console.log('✅ [broker-queue] ACK', queueName);
          }
          catch (err) {
            span?.recordException(err as Error);
            console.error('❌ [broker-queue] command handler failed on', queueName, err);
            // no requeue on handler error
            this.cmdCh.nack(msg, false, false);
          }
          finally {
            span?.end();
          }
        });
      }
    );
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