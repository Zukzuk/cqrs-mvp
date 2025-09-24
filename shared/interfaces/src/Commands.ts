import { TCalendarCommandUnion } from "./calendar/Commands";
import { TOrderCommandUnion } from "./order/Commands";

// Root command interface

export interface ICommand<P = any> {
  readonly type: string;
  readonly payload: P;
  readonly correlationId: string;
}

// Discriminated union of all command types for convenience

export type TCommandUnion =
  TOrderCommandUnion
  | TCalendarCommandUnion