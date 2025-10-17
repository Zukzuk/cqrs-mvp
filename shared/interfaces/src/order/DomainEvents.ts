import { IDomainEvent } from "../DomainEvents";
import { ViolationReason } from "../Types";

// Order Created Events

export interface IOrderCreatedEvent extends IDomainEvent<{
  orderId: string;
  userId: string;
  total: number;
}> { readonly type: 'OrderCreated'; }

export interface IOrderCreationFailedEvent extends IDomainEvent<IOrderCreatedEvent["payload"] & {
  reason: ViolationReason;
  message: string;
}> { readonly type: 'OrderCreationFailed'; }

// Order Shipped Events

export interface IOrderShippedEvent extends IDomainEvent<{
  orderId: string;
  userId: string;
  shippedAt?: string; // ISO date
  carrier: string;
  trackingNumber: string;
}> { readonly type: 'OrderShipped'; }

export interface IOrderShippingFailedEvent extends IDomainEvent<IOrderShippedEvent["payload"] & {
  reason: ViolationReason;
  message: string;
}> { readonly type: 'OrderShippingFailed'; }

export type TOrderEventUnion =
  IOrderCreatedEvent
  | IOrderShippedEvent
  | IOrderCreationFailedEvent
  | IOrderShippingFailedEvent;