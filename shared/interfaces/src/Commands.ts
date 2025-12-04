import { TOrderCommandUnion } from "./order/Commands";

// Root command interface
export interface ICommand<P = any> {
  readonly type: TCommandTypes;
  readonly payload: P;
  readonly correlationId: string;
}

// Discriminated union of all command types for convenience
export type TCommandUnion =
  TOrderCommandUnion

// Union of all domain event "type" strings for convenience
export type TCommandTypes = TCommandUnion['type'];