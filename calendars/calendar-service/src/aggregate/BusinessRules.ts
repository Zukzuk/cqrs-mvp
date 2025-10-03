import { RuleResult, Violation, ViolationReason } from "@daveloper/interfaces";

// Helper to create a Violation object.
const fail = (reason: ViolationReason, message: string): Violation => ({ reason, message });

// Business Rules

export const calendarMustNotBeRemoved = (removed: boolean): RuleResult =>
  removed ? fail('Removed', 'Calendar has been removed') : null;

export const calendarMustExist = (exists: boolean, removed: boolean): RuleResult =>
  (!exists || removed) ? fail(removed ? 'Removed' : 'NotFound', 'Calendar does not exist') : null;

export const calendarMustNotExist = (exists: boolean): RuleResult =>
  exists ? fail('AlreadyExists', 'Calendar already exists') : null;

export const timeRangeValid = (start: string, end: string): RuleResult =>
  start < end ? null : fail('InvalidTimeRange', 'Start must be before end');

export const timeslotMustNotExist = (hasTimeslot: boolean): RuleResult =>
  hasTimeslot ? fail('AlreadyExists', 'Timeslot already exists') : null;

export const timeslotMustExist = (hasTimeslot: boolean): RuleResult =>
  hasTimeslot ? null : fail('NotFound', 'Timeslot does not exist');

export const noCalendarOverlap = (
  start: string,
  end: string,
  timeslots: Map<string, { start: string; end: string }>,
  exceptTimeslotId?: string
): RuleResult => {
  for (const [id, ts] of timeslots.entries()) {
    // skip the timeslot being rescheduled
    if (exceptTimeslotId && id === exceptTimeslotId) continue;
    // check for overlap
    if (start < ts.end && ts.start < end) {
      return fail('OverlapCalendar', 'Timeslot overlaps within calendar');
    }
  }
  return null;
};
