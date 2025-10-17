import type { IBroker, ICommand, IDomainEvent } from '@daveloper/interfaces';
import { AggregateRoot } from './AggregateRoot';
import { BaseRepository } from './Repository';

export abstract class BaseHandler<
    Cmd extends ICommand,
    Agg extends AggregateRoot<Evt>,
    Evt extends IDomainEvent
> {
    constructor(protected repo: BaseRepository<Agg, Evt>, protected broker: IBroker) { }

    protected async saveAndPublish(agg: Agg) {
        await this.repo.save(agg);
        for (const ev of agg.uncommittedEvents as Evt[]) {
            await this.broker.publish(ev);
        }
        agg.clearEvents();
    }

    abstract handle(cmd: Cmd): Promise<void>;
}

// ----- Dispatcher -----

export type HandlerFor<
    Cmd extends ICommand,
    K extends Cmd['type']
> = { handle(cmd: Extract<Cmd, { type: K }>): Promise<void> };

export class BaseDispatcher<Cmd extends ICommand> {
    constructor(
        private readonly handlers: { [K in Cmd['type']]: HandlerFor<Cmd, K> }
    ) { }

    async dispatch<K extends Cmd['type']>(cmd: Extract<Cmd, { type: K }>) {
        const h = this.handlers[cmd.type] as HandlerFor<Cmd, K>;
        return h.handle(cmd);
    }
}
