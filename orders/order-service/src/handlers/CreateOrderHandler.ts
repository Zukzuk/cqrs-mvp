import { BaseHandler, BaseRepository } from '@daveloper/cqrs';
import type { IBroker, ICreateOrderCommand, TOrderEventUnion } from '@daveloper/interfaces';
import { Order } from '../aggregate/OrderAggregate';

export class CreateOrderHandler extends BaseHandler<ICreateOrderCommand, Order, TOrderEventUnion> {
    constructor(repo: BaseRepository<Order, TOrderEventUnion>, broker: IBroker) {
        super(repo, broker);
    }

    async handle(cmd: ICreateOrderCommand) {
        // Business logic
        const id = String(cmd.payload.orderId);
        const order = await this.repo.load(id, () => new Order());
        order.createOrder(cmd.payload, cmd.correlationId);
        // Persist and publish event
        await this.saveAndPublish(order);
    }
}
