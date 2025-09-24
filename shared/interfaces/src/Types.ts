import { ViolationReason } from "./calendar/Types";

// A violation carries a typed reason + human message.
export type Violation = Readonly<{ reason: ViolationReason; message: string }>;

// Rules return `null` when OK, or a `Violation` when they fail.
export type RuleResult = Violation | null;