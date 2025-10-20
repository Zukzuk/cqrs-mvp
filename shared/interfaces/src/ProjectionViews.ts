import { TOrderStatus, TTimeslot } from "./Types";

export interface ShopOrdersDocument {
    orderId: string;
    userId: string;
    status: TOrderStatus;
    correlationId: string;
    total?: number;
    shippedAt?: string;
    carrier?: string;
    trackingNumber?: string;
}

export interface CalendarDocument{
    calendarId: string;
    userId: string;
    timeslots: TTimeslot[];
    updatedAt ?: string;
}