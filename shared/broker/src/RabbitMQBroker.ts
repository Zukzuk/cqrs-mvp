import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib';
import { IBroker, IDomainEvent, ICommandHandler } from './IBroker';

/**
 * Support publishing domain events and subscribing handlers with routing key filters.
 */
export class RabbitMQBroker implements IBroker {
  private conn!: Connection;
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
  async publish(evt: IDomainEvent) {
    const payload = Buffer.from(JSON.stringify(evt));
    this.pubCh.publish(
      this.exchange,
      evt.type,
      payload,
      { persistent: true }
    );
    console.log('📤 [broker-publish] published', evt.type, 'corrId=', evt.correlationId);
  }

  /**
   * Subscribe to domain events with optional routing key patterns.
   * Each consumer (projection, event-store, etc.) binds its own queue 
   * to get exactly the slice of the stream it needs.
   * Returns an unsubscribe function that cancels the consumer.
   */
  async subscribe(
    handler: (evt: IDomainEvent) => Promise<void>,
    options: {
      queue?: string;
      durable?: boolean;
      exchange?: string;
      autoDelete?: boolean;
      routingKeys?: string[];
    } = {}
  ): Promise<() => Promise<void>> {
    const { queue, durable = false, autoDelete = true, routingKeys, exchange } = options;
    const q = await this.subCh.assertQueue(queue || '', { exclusive: !queue, durable, autoDelete });
    console.log(`🪝 [broker-subscribe] declaring queue='${q.queue}', durable=${durable}, autoDelete=${autoDelete}`);

    // Determine which routing patterns to bind
    const keys = routingKeys && routingKeys.length ? routingKeys : ['#'];
    const exch = exchange ? exchange : this.exchange;
    for (const key of keys) {
      await this.subCh.bindQueue(q.queue, exch, key);
      console.log(`🔗 [broker-subscribe] bound queue='${q.queue}' -> exchange='${exch}' with routingKey='${key}'`);
    }

    // Process one message at a time per consumer
    await this.subCh.prefetch(1);

    const { consumerTag } = await this.subCh.consume(
      q.queue,
      async (msg: ConsumeMessage | null) => {
        if (!msg) return;
        const event: IDomainEvent = JSON.parse(msg.content.toString());
        console.log('📨 [broker-subscribe] received event', event.type, 'on queue=', q.queue);
        try {
          await handler(event);
          this.subCh.ack(msg);
          console.log('✅ [broker-subscribe] ACK', event.type);
        } catch (err) {
          console.error('❌ [broker-subscribe] handler failed for', event.type, err);
          this.subCh.nack(msg, false, false);
        }
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
  async send(queueName: string, payload: any) {
    await this.cmdCh.assertQueue(queueName, { durable: true });
    this.cmdCh.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    );
    console.log('📨 [broker-send] sent command to queue=', queueName);
  }

  /**
   * Consume a command queue with a given handler.
   */
  async consumeQueue<T = any>(
    queueName: string,
    handler: ICommandHandler<T>
  ) {
    await this.cmdCh.assertQueue(queueName, { durable: true });
    console.log(`🪡 [broker-queue] consuming command queue='${queueName}'`);
    await this.cmdCh.consume(
      queueName,
      async (msg: ConsumeMessage | null) => {
        if (!msg) return;
        try {
          const data = JSON.parse(msg.content.toString()) as T;
          console.log('📨 [broker-queue] received command on', queueName, data);
          await handler(data);
          this.cmdCh.ack(msg);
          console.log('✅ [broker-queue] ACK', queueName);
        } catch (err) {
          console.error('❌ [broker-queue] command handler failed on', queueName, err);
          this.cmdCh.nack(msg, false, false);
        }
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