import { IOrderCreatedEvent, IOrderShippedEvent } from "@daveloper/interfaces";

export class OrderCreated implements IOrderCreatedEvent {
  readonly type = 'OrderCreated' as const;
  constructor(
    public payload: IOrderCreatedEvent["payload"], 
    public correlationId: string
  ) {}
}

export class OrderShipped implements IOrderShippedEvent {
  readonly type = 'OrderShipped' as const;
  constructor(
    public payload: IOrderShippedEvent["payload"], 
    public correlationId: string
  ) {}
}