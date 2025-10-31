import { TOrderStatus, TTimeslot } from "./Types";

export type TProjectionMeta = {
  _id: string;
  lastSequence: number;
}

export type TShopOrdersDocument = {
  orderId: string;
  userId: string;
  status: TOrderStatus;
  correlationId: string;
  total?: number;
  shippedAt?: string;
  carrier?: string;
  trackingNumber?: string;
}

export type TCalendarDocument = {
  calendarId: string;
  userId: string;
  timeslots: TTimeslot[];
  updatedAt?: string;
}