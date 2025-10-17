import type { ICreateOrderCommand, IShipOrderCommand, RuleResult, Violation } from '@daveloper/interfaces';

// tiny helper, same style as Calendar
const fail = (reason: Violation['reason'], message: string): Violation => ({ reason, message });

// Payload rules (pure)

export const createPayloadValid = (p: ICreateOrderCommand['payload']): RuleResult => {
    if (!p.orderId) return fail('InvalidArgument', 'Missing orderId');
    if (!p.userId) return fail('InvalidArgument', 'Missing userId');
    if (typeof p.total !== 'number' || p.total <= 0) {
        return fail('InvalidArgument', 'Total must be > 0');
    }
    return null;
};

export const shipPayloadValid = (p: IShipOrderCommand['payload']): RuleResult => {
    if (!p.orderId) return fail('InvalidArgument', 'Missing orderId');
    if (!p.carrier) return fail('InvalidArgument', 'Missing carrier');
    if (!p.trackingNumber) return fail('InvalidArgument', 'Missing trackingNumber');
    // optionally validate p.shippedAt format here
    return null;
};

// State rules (need aggregate state)

export const orderMustNotExist = (exists: boolean): RuleResult =>
    exists ? fail('AlreadyExists', 'Order already exists') : null;

export const orderMustExist = (exists: boolean): RuleResult =>
    exists ? null : fail('NotFound', 'Order does not exist');

export const orderMustBeCreatable = (status: 'CREATED' | 'SHIPPED' | 'CANCELLED' | undefined): RuleResult =>
    status ? fail('AlreadyExists', 'Order already exists') : null;

export const orderMustBeShippable = (status: 'CREATED' | 'SHIPPED' | 'CANCELLED' | undefined): RuleResult => {
    if (status === 'CREATED') return null;
    if (status === 'SHIPPED') return fail('InvalidState', 'Order already shipped');
    if (status === 'CANCELLED') return fail('InvalidState', 'Order is cancelled');
    return fail('NotFound', 'Order does not exist');
};
