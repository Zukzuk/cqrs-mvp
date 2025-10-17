import {
  IOrderCreatedEvent,
  IOrderShippedEvent,
  IOrderCreationFailedEvent,
  IOrderShippingFailedEvent,
} from '@daveloper/interfaces';

export class OrderCreated implements IOrderCreatedEvent {
  readonly type = 'OrderCreated' as const;
  constructor(
    public payload: IOrderCreatedEvent['payload'], 
    public correlationId: string
  ) { }
}

export class OrderShipped implements IOrderShippedEvent {
  readonly type = 'OrderShipped' as const;
  constructor(
    public payload: IOrderShippedEvent['payload'], 
    public correlationId: string
  ) { }
}

export class OrderCreationFailed implements IOrderCreationFailedEvent {
  readonly type = 'OrderCreationFailed' as const;
  constructor(
    public payload: IOrderCreationFailedEvent['payload'], 
    public correlationId: string
  ) { }
}

export class OrderShippingFailed implements IOrderShippingFailedEvent {
  readonly type = 'OrderShippingFailed' as const;
  constructor(
    public payload: IOrderShippingFailedEvent['payload'], 
    public correlationId: string
  ) { }
}
