import { IOrderCreatedEvent } from "@daveloper/interfaces";

export class OrderCreated implements IOrderCreatedEvent {
  readonly type = 'OrderCreated' as const;
  constructor(
    public payload: IOrderCreatedEvent["payload"],
    public correlationId: string,
  ) { }
}