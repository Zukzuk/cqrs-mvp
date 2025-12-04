export type TOrderStatus = 'PENDING' | 'FAILED' | 'CREATED' | 'SHIPPED' | 'CANCELLED';

export type TISODateTime = string; // must be valid ISO-8601

export type TTimeslot = {
    timeslotId: string;
    title: string;
    start: TISODateTime;
    end: TISODateTime;
    location?: string;
    description?: string;
};

export type TViolationReason =
    | 'AlreadyExists'
    | 'NotFound'
    | 'Removed'
    | 'InvalidTimeRange'
    | 'InvariantViolation'
    | 'InvalidArgument'
    | 'InvalidState'
    ;

// A violation carries a typed reason + human message.
export type TViolation = Readonly<{ reason: TViolationReason; message: string }>;

// Rules return `null` when OK, or a `Violation` when they fail.
export type TRuleResult = TViolation | null;

// Rule is lazy so callers can short-circuit
export type TRule = () => TRuleResult;
