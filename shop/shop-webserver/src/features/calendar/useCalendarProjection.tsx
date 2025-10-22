import { useEffect, useMemo, useState } from "react";
import { getSocket } from "../../socket";
import type { CalendarDocument, TTimeslot } from "@daveloper/interfaces";

type CalendarState = { calendarId: string; timeslots: TTimeslot[]; updatedAt?: string } | null;

export function useCalendarProjection(userId: string) {
    const socket = useMemo(() => getSocket(userId), [userId]);
    const [calendar, setCalendar] = useState<CalendarState>(null);

    useEffect(() => {
        function onSnapshot(payload: { userId: string; calendar: CalendarDocument }) {
            if (payload.userId !== userId) return;
            setCalendar({ calendarId: payload.calendar.calendarId, timeslots: payload.calendar.timeslots, updatedAt: payload.calendar.updatedAt });
        }
        function onUpdate(payload: any) {
            if (payload.userId !== userId) return;
            setCalendar((prev) => {
                const cur = prev ?? { calendarId: userId, timeslots: [] };
                if (payload.removeTimeslotId) {
                    return { ...cur, timeslots: cur.timeslots.filter(t => t.timeslotId !== payload.removeTimeslotId) };
                }
                if (payload.timeslot) {
                    const t = payload.timeslot as TTimeslot;
                    const rest = cur.timeslots.filter(x => x.timeslotId !== t.timeslotId);
                    return { ...cur, timeslots: [...rest, t].sort((a, b) => a.start.localeCompare(b.start)) };
                }
                // bare update (e.g., CalendarCreated)
                return { ...cur };
            });
        }

        socket.on("calendars_snapshot", onSnapshot);
        socket.on("calendar_update", onUpdate);
        return () => {
            socket.off("calendars_snapshot", onSnapshot);
            socket.off("calendar_update", onUpdate);
        };
    }, [socket, userId]);

    return { calendar };
}