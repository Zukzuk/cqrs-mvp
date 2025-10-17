export type ISODateTime = string; // must be valid ISO-8601

export type Timeslot = {
    timeslotId: string;
    title: string;
    start: ISODateTime;
    end: ISODateTime;
    location?: string;
    description?: string;
};

export type ViolationReason =
    | 'AlreadyExists'
    | 'NotFound'
    | 'Removed'
    | 'InvalidTimeRange'
    | 'OverlapCalendar'
    | 'InvariantViolation'
    | 'InvalidArgument'
    | 'InvalidState'
    ;

// A violation carries a typed reason + human message.
export type Violation = Readonly<{ reason: ViolationReason; message: string }>;

// Rules return `null` when OK, or a `Violation` when they fail.
export type RuleResult = Violation | null;

// Rule is lazy so callers can short-circuit
export type Rule = () => RuleResult;
