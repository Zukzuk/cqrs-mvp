import { BaseDispatcher, BaseRepository, HandlerFor } from '@daveloper/cqrs';
import type { IBroker, TOrderCommandUnion, TOrderEventUnion } from '@daveloper/interfaces';
import { Order } from '../aggregate/OrderAggregate';
import { CreateOrderHandler } from './CreateOrderHandler';
import { ShipOrderHandler } from './ShipOrderHandler';

export class Dispatcher {
    private dispatcher: BaseDispatcher<TOrderCommandUnion>;

    constructor(repo: BaseRepository<Order, TOrderEventUnion>, broker: IBroker) {
        const handlers = {
            CreateOrder: new CreateOrderHandler(repo, broker),
            ShipOrder: new ShipOrderHandler(repo, broker),
        } satisfies {
            [K in TOrderCommandUnion['type']]: HandlerFor<TOrderCommandUnion, K>
        };

        this.dispatcher = new BaseDispatcher<TOrderCommandUnion>(handlers);
    }

    async dispatch(cmd: TOrderCommandUnion) {
        return this.dispatcher.dispatch(cmd);
    }
}
