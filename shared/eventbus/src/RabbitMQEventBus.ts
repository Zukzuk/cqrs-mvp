import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib';
import { IEventBus, IDomainEvent, ICommandHandler } from './IEventBus';

export class RabbitMQEventBus implements IEventBus {
  private conn!: Connection;
  private pubCh!: Channel;
  private subCh!: Channel;
  private cmdCh!: Channel;
  private exchange = 'events';

  constructor(private url: string) {}

  async init() {
    this.conn = await amqp.connect(this.url);
    this.pubCh = await this.conn.createChannel();
    this.subCh = await this.conn.createChannel();
    this.cmdCh = await this.conn.createChannel();

    await this.pubCh.assertExchange(this.exchange, 'fanout', { durable: true });
    await this.subCh.assertExchange(this.exchange, 'fanout', { durable: true });
  }

  async publish(evt: IDomainEvent) {
    this.pubCh.publish(
      this.exchange,
      '',
      Buffer.from(JSON.stringify(evt)),
      { persistent: true }
    );
  }

  async subscribe(
    handler: (evt: IDomainEvent) => Promise<void>,
    options: {
      queue?: string;
      durable?: boolean;
      autoDelete?: boolean;
      routingKeys?: string[];
    } = {}
  ): Promise<() => Promise<void>> {
    const { queue, durable = false, autoDelete = true, routingKeys } = options;
    const q = await this.subCh.assertQueue(queue || '', { exclusive: !queue, durable, autoDelete });
    const keys = routingKeys?.length ? routingKeys : [''];
    for (const key of keys) await this.subCh.bindQueue(q.queue, this.exchange, key);
    const { consumerTag } = await this.subCh.consume(q.queue, async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      const event: IDomainEvent = JSON.parse(msg.content.toString());
      try {
        await handler(event);
        this.subCh.ack(msg);
      } catch {
        this.subCh.nack(msg, false, false);
      }
    });
    return async () => { await this.subCh.cancel(consumerTag); };
  }

  async send(queueName: string, payload: any) {
    await this.cmdCh.assertQueue(queueName, { durable: true });
    this.cmdCh.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    );
  }

  async consumeQueue<T = any>(
    queueName: string,
    handler: ICommandHandler<T>
  ) {
    await this.cmdCh.assertQueue(queueName, { durable: true });
    await this.cmdCh.consume(queueName, async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const data = JSON.parse(msg.content.toString()) as T;
        await handler(data);
        this.cmdCh.ack(msg);
      } catch {
        this.cmdCh.nack(msg, false, false);
      }
    });
  }

  async close() {
    await this.pubCh.close();
    await this.subCh.close();
    await this.cmdCh.close();
    await this.conn.close();
  }
}