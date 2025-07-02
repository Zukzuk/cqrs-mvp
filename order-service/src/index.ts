import { RabbitMQEventBus } from '@daveloper/eventbus';
import { CreateOrderHandler } from './commandHandler';
import { InMemoryRepository } from './repository';
import { CreateOrderCommand } from './commands';
import { Order } from './orderAggregate';

(async () => {
  const url = process.env.RABBITMQ_URL!;
  const bus = new RabbitMQEventBus(url);
  await bus.init();

  // Wire up your domain handler exactly once:
  const repo = new InMemoryRepository<Order>();
  const handler = new CreateOrderHandler(repo, bus);

  // Now consume the "commands" queue entirely through the façade:
  await bus.consumeQueue<CreateOrderCommand>('commands', async (cmd) => {
    if (cmd.type === 'CreateOrder') {
      await handler.handle(cmd);
    }
  });

  console.log('Order Service up — all AMQP hidden behind EventBus');
})();
