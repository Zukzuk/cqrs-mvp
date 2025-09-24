import { TCommandUnion, TDomainEventUnion, TDomainEventTypes } from './index';

export interface ICommandHandler<T = any> { (message: T): Promise<void>; }

export interface IBroker {
  // Publish any one of the domain events
  publish<E extends TDomainEventUnion = TDomainEventUnion>(event: E): Promise<void>;

  // Subscribe can be generic for a narrow handler
  subscribe<E extends TDomainEventUnion = TDomainEventUnion>(
    handler: (event: E) => Promise<void>,
    options: {
      queue: string;
      durable: boolean;
      exchange: string;
      autoDelete: boolean;
      routingKeys: TDomainEventTypes[];  // only keys from the entire set of domain‐event types
    }
  ): Promise<() => Promise<void>>;

  // Send a command to the commands queue
  send<C extends TCommandUnion>(queueName: string, command: C): Promise<void>;

  // Consume a command queue with a given handler
  consumeQueue<C extends TCommandUnion>(queueName: string, handler: ICommandHandler<C>): Promise<void>;
}