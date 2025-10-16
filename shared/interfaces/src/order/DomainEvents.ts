import { IDomainEvent } from "../DomainEvents";

export interface IOrderCreatedEvent extends IDomainEvent<{
    orderId: string;
    userId: string;
    total: number;
  }> { readonly type: 'OrderCreated'; }

export interface IOrderShippedEvent extends IDomainEvent<{
    orderId: string;
    userId: string;
    shippedAt: string; // ISO date
    carrier: string;
    trackingNumber: string;
  }> { readonly type: 'OrderShipped'; }

export type TOrderEventUnion =
  IOrderCreatedEvent
  | IOrderShippedEvent;