import { RabbitMQEventBus } from '@daveloper/eventbus'

export async function initBus() {
    const bus = new RabbitMQEventBus(process.env.RABBITMQ_URL!)
    await bus.init()
    console.log('🟢 [bff-bus] initialized')
    return bus
}
