import { IEventBus, IDomainEvent, ICommandHandler } from './IEventBus';

// FOR TESTS 

export class InMemoryEventBus implements IEventBus {
  private handlers: Array<(evt: IDomainEvent) => void> = [];
  async publish(evt: IDomainEvent) {
    for (const h of this.handlers) h(evt);
  }
  async subscribe(
    handler: (evt: IDomainEvent) => Promise<void>
  ) {
    const syncH = (evt: IDomainEvent) => void handler(evt);
    this.handlers.push(syncH);
    return async () => {
      this.handlers = this.handlers.filter(h => h !== syncH);
    };
  }
  async send() { /* no-op */ }
  async consumeQueue() { /* no-op */ }
}