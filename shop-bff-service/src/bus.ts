import { RabbitMQBroker } from '@daveloper/broker'

export async function initBus() {
    const bus = new RabbitMQBroker(process.env.RABBITMQ_URL!)
    await bus.init()
    console.log('🟢 [bff-bus] initialized')
    return bus
}
