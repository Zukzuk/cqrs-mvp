import { BaseAggregate } from '@daveloper/cqrs';
import type {
  TOrderEventUnion,
  IOrderCreatedEvent,
  IOrderShippedEvent,
  ICreateOrderCommand,
  IShipOrderCommand,
} from '@daveloper/interfaces';
import {
  OrderCreated,
  OrderShipped,
  OrderCreationFailed,
  OrderShippingFailed,
} from '../events';
import {
  orderMustNotExist,
  orderMustExist,
  createPayloadValid,
  shipPayloadValid,
  orderMustBeCreatable,
  orderMustBeShippable,
} from './BusinessRules';

export class Order extends BaseAggregate<TOrderEventUnion> {
  public id?: string;
  public status?: 'CREATED' | 'SHIPPED' | 'CANCELLED';
  public userId?: string;
  public total?: number;

  // Commands

  createOrder(payload: ICreateOrderCommand['payload'], correlationId: string) {
    this.aggregateAndRaiseEvents(payload, correlationId, {
      rules: [
        () => createPayloadValid(payload),
        () => orderMustNotExist(!!this.id),
        () => orderMustBeCreatable(this.status),
      ],
      SuccessEvent: OrderCreated,
      FailedEvent: OrderCreationFailed,
    });
  }

  shipOrder(payload: IShipOrderCommand['payload'], correlationId: string) {
    this.aggregateAndRaiseEvents({ ...payload, userId: this.userId!} , correlationId, {
      rules: [
        () => shipPayloadValid(payload),
        () => orderMustExist(!!this.id),
        () => orderMustBeShippable(this.status),
      ],
      SuccessEvent: OrderShipped,
      FailedEvent: OrderShippingFailed,
    });
  }

  // Event appliers

  private onOrderCreated(e: IOrderCreatedEvent) {
    this.id = String(e.payload.orderId);
    this.userId = e.payload.userId;
    this.total = e.payload.total;
    this.status = 'CREATED';
  }

  private onOrderShipped(_e: IOrderShippedEvent) {
    this.status = 'SHIPPED';
  }
}
