// src/index.ts
import { RabbitMQEventBus } from '@daveloper/eventbus';
import { IDomainEvent } from '@daveloper/eventbus';

(async () => {
  const url = process.env.RABBITMQ_URL!;
  const bus = new RabbitMQEventBus(url);

  // 1) Initialize connection, channels & exchange
  await bus.init();

  // 2) Subscribe via a named, durable queue:
  //    We want to reuse 'order-projection-q' so on restart we get old
  //    undelivered messages, too.
  await bus.subscribe(
    async (event: IDomainEvent) => {
      console.log('Projected event:', event);
      // … your projection logic here …
    },
    {
      // special options for a durable, named queue
      queue: 'order-projection-q',
      durable: true,
      autoDelete: false,
      // routingKeys: [''], // fanout uses empty routing key
    }
  );

  console.log('Order Projection Service up and listening');
})();
