import { IDomainEvent } from "../DomainEvents";

export interface IOrderCreatedEvent extends IDomainEvent<{
    orderId: string;
    userId: string;
    total: number;
  }> { readonly type: 'OrderCreated'; }

export type TOrderEventUnion =
  IOrderCreatedEvent;