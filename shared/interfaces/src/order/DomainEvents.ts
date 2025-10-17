import { IDomainEvent } from "../DomainEvents";
import { TOrderStatus, TViolationReason } from "../Types";

// Order Created Events

export interface IOrderCreatedEvent extends IDomainEvent<{
  orderId: string;
  userId: string;
  status: TOrderStatus;
  total: number;
}> { readonly type: 'OrderCreated'; }

export interface IOrderCreationFailedEvent extends IDomainEvent<IOrderCreatedEvent["payload"] & {
  reason: TViolationReason;
  message: string;
}> { readonly type: 'OrderCreationFailed'; }

// Order Shipped Events

export interface IOrderShippedEvent extends IDomainEvent<{
  orderId: string;
  userId: string;
  status: TOrderStatus;
  shippedAt?: string; // ISO date
  carrier: string;
  trackingNumber: string;
}> { readonly type: 'OrderShipped'; }

export interface IOrderShippingFailedEvent extends IDomainEvent<IOrderShippedEvent["payload"] & {
  reason: TViolationReason;
  message: string;
}> { readonly type: 'OrderShippingFailed'; }

export type TOrderEventUnion =
  IOrderCreatedEvent
  | IOrderShippedEvent
  | IOrderCreationFailedEvent
  | IOrderShippingFailedEvent;