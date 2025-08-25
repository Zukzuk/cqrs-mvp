import { TCommandUnion, TDomainEventUnion, TAllDomainEventTypes } from './index';

export interface ICommandHandler<T = any> {
  (message: T, meta?: MessageMeta): Promise<void>;
}

export type PublishOptions = { 
  headers?: Record<string, unknown>; 
  persistent?: boolean 
};

export type MessageMeta = {
  headers?: Record<string, unknown>; 
  routingKey?: string; 
  exchange?: string;
  deliveryTag?: number; 
  raw?: Buffer;
};

export interface IBroker {
  // --- Domain events ---
  publish<E extends TDomainEventUnion = TDomainEventUnion>(
    event: E,
    opts?: PublishOptions // allow header injection
  ): Promise<void>;

  subscribe<E extends TDomainEventUnion = TDomainEventUnion>(
    handler: (event: E, meta?: MessageMeta) => Promise<void>,
    options: {
      queue: string;
      durable: boolean;
      exchange: string;
      autoDelete: boolean;
      routingKeys: TAllDomainEventTypes[];
    }
  ): Promise<() => Promise<void>>;

  // --- Commands ---
  send<C extends TCommandUnion>(
    queueName: string,
    command: C,
    opts?: PublishOptions // allow header injection
  ): Promise<void>;

  consumeQueue<C extends TCommandUnion>(
    queueName: string,
    handler: ICommandHandler<C>
  ): Promise<void>;
}