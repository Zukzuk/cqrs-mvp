import { RabbitMQBroker } from '@daveloper/broker'

export async function initBus() {
    const bus = new RabbitMQBroker(process.env.BROKER_URL!)
    await bus.init()
    console.log('🟢 [bff-bus] initialized')
    return bus
}
