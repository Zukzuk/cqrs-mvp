export interface IDomainEvent {
  readonly type: string;
  readonly payload: any;
}

export interface ICommandHandler<T = any> {
  (message: T): Promise<void>;
}

export interface IEventBus {
  publish(event: IDomainEvent): Promise<void>;
  subscribe(
    handler: (event: IDomainEvent) => Promise<void>,
    options?: {
      queue?: string;
      durable?: boolean;
      autoDelete?: boolean;
      routingKeys?: string[];
    }
  ): Promise<() => Promise<void>>;
  send(queueName: string, payload: any): Promise<void>;
  consumeQueue<T = any>(
    queueName: string,
    handler: ICommandHandler<T>
  ): Promise<void>;
}