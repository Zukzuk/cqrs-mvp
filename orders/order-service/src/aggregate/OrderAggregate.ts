import { BaseAggregate } from '@daveloper/cqrs';
import type {
  TOrderEventUnion,
  IOrderCreatedEvent,
  IOrderShippedEvent,
  ICreateOrderCommand,
  IShipOrderCommand,
  TOrderStatus,
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
  public userId?: string;
  public status?: TOrderStatus;
  public total?: number;
  public shippedAt?: string;
  public carrier?: string;
  public trackingNumber?: string;

  // Commands

  createOrder(payload: ICreateOrderCommand['payload'], correlationId: string) {
    this.aggregateAndRaiseEvents({ ...payload, status: 'CREATED' }, correlationId, {
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
    this.aggregateAndRaiseEvents({ ...payload, userId: this.userId!, status: 'SHIPPED' }, correlationId, {
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
    this.status = e.payload.status;
  }

  private onOrderShipped(e: IOrderShippedEvent) {
    this.status = e.payload.status;
    this.shippedAt = e.payload.shippedAt;
    this.carrier = e.payload.carrier;
    this.trackingNumber = e.payload.trackingNumber;
  }
}
