import amqp from 'amqplib';
(async () => {
  const conn = await amqp.connect(process.env.RABBITMQ_URL!);
  const ch = await conn.createChannel();
  await ch.assertQueue('events');
  ch.consume('events', msg => {
    console.log("consume events", msg)
    if (msg) {
      console.log('Projected:', JSON.parse(msg.content.toString()));
      ch.ack(msg);
    }
  });
  console.log('Order Projection Service up');
})();