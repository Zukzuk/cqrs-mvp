// Calendar related types

export type Timeslot = {
  timeslotId: string;
  title: string;
  start: ISODateTime;
  end: ISODateTime;
  location?: string;
  description?: string;
};

export type ISODateTime = string; // must be valid ISO-8601