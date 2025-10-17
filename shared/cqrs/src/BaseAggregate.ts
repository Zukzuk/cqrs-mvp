import { AggregateRoot } from './AggregateRoot';
import type { IDomainEvent, TRule, TViolation } from '@daveloper/interfaces';

// Constructors that produce the domain event union `E`
type SuccessCtor<P, E extends IDomainEvent> =
    new (payload: P, correlationId: string) => E;

type FailedCtor<P, E extends IDomainEvent> =
    new (payload: P & TViolation, correlationId: string) => E;

/**
 * BaseAggregate adds a tiny, reusable helper to evaluate rules and raise either
 * a SuccessEvent or one-or-more FailedEvents (violation style).
 * It stays generic over the domain event union `E` and does not
 * prescribe any business logic.
 */
export abstract class BaseAggregate<E extends IDomainEvent> extends AggregateRoot<E> {
    protected aggregateAndRaiseEvents<P extends Record<string, unknown>>(
        payload: P,
        correlationId: string,
        cfg: {
            rules: TRule[];                            // lazy rules
            SuccessEvent: SuccessCtor<P, E>;
            FailedEvent: FailedCtor<P, E>;
            stopOnFirstViolation?: boolean;            // default: emit ALL violations
        },
    ): void {
        const { rules, SuccessEvent, FailedEvent, stopOnFirstViolation = false } = cfg;

        const violations: TViolation[] = [];
        for (const r of rules) {
            const v = r();
            if (v) {
                violations.push(v);
                if (stopOnFirstViolation) break;
            }
        }

        if (violations.length > 0) {
            for (const v of violations) {
                console.log('🛑 [aggregate] Raising failed event due to violation:', v);
                this.raise(new FailedEvent({ ...payload, ...v }, correlationId));
            }
            return;
        }

        this.raise(new SuccessEvent({ ...payload }, correlationId));
    }
}
