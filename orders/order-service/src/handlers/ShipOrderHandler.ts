import { BaseHandler, BaseRepository } from '@daveloper/cqrs';
import type { IBroker, IShipOrderCommand, TOrderEventUnion } from '@daveloper/interfaces';
import { Order } from '../aggregate/OrderAggregate';

export class ShipOrderHandler extends BaseHandler<IShipOrderCommand, Order, TOrderEventUnion> {
    constructor(repo: BaseRepository<Order, TOrderEventUnion>, broker: IBroker) {
        super(repo, broker);
    }

    async handle(cmd: IShipOrderCommand) {
        // Business logic
        const id = String(cmd.payload.orderId);
        const order = await this.repo.load(id, () => new Order());
        order.shipOrder(cmd.payload, cmd.correlationId);
        // Persist and publish event
        await this.saveAndPublish(order);
    }
}
