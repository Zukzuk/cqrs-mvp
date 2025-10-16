import { TCalendarEventUnion } from "./calendar/DomainEvents";
import { TOrderEventUnion } from "./order/DomainEvents";

// Root domain event interface

export interface IDomainEvent<P = any> {
  readonly type: TDomainEventTypes;
  readonly payload: P;
  readonly correlationId: string;
}

// Discriminated union of all domain event types for convenience

export type TDomainEventUnion =
  TOrderEventUnion
  | TCalendarEventUnion;

// Union of all domain event "type" strings for convenience
export type TDomainEventTypes = TDomainEventUnion['type'];
