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
  | 'InvariantViolation';
