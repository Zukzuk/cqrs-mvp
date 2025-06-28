import amqp from 'amqplib';
import { CreateOrderHandler } from './commandHandler';
import { InMemoryRepository } from './repository';
import { EventBus } from './eventBus';
import { CreateOrderCommand } from './commands';
(async () => {
  const conn = await amqp.connect(process.env.RABBITMQ_URL!);
  const ch = await conn.createChannel();
  await ch.assertQueue('commands');
  const handler = new CreateOrderHandler(new InMemoryRepository(), new EventBus(ch));
  ch.consume('commands', async msg => {
    console.log("consume commands", msg)
    if (msg) {
      const cmd = JSON.parse(msg.content.toString()) as CreateOrderCommand;
      if (cmd.type === 'CreateOrder') await handler.handle(cmd);
      console.log("ack", msg);
      ch.ack(msg);
    }
  });
  console.log('Command Service up');
})();