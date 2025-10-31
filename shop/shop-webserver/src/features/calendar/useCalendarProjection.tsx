import { useEffect, useMemo, useState } from "react";
import { getSocket } from "../../socket";
import type { CalendarDocument, TTimeslot } from "@daveloper/interfaces";

export function useCalendarProjection(userId: string) {
    const socket = useMemo(() => getSocket(userId), [userId]);
    const [calendar, setCalendar] = useState<CalendarDocument>(null);

    useEffect(() => {
        function onSnapshot(payload: { userId: string; calendar: CalendarDocument | null }) {
            if (payload.userId !== userId) return;
            if (!payload.calendar) {
                setCalendar(null);
                return;
            }
            setCalendar({
                calendarId: payload.calendar.calendarId,
                timeslots: [...(payload.calendar.timeslots ?? [])].sort((a, b) =>
                    a.start.localeCompare(b.start)
                ),
                updatedAt: payload.calendar.updatedAt,
            });
        }

        function onUpdate(payload: any) {
            if (payload.userId !== userId) return;
            setCalendar((prev) => {
                const cur = prev ?? { calendarId: userId, timeslots: [] };
                if (payload.removeTimeslotId) {
                    return {
                        ...cur,
                        timeslots: cur.timeslots.filter((t) => t.timeslotId !== payload.removeTimeslotId),
                    };
                }
                if (payload.timeslot) {
                    const t = payload.timeslot as TTimeslot;
                    const rest = cur.timeslots.filter((x) => x.timeslotId !== t.timeslotId);
                    return {
                        ...cur,
                        timeslots: [...rest, t].sort((a, b) => a.start.localeCompare(b.start)),
                    };
                }
                return cur;
            });
        }

        // Register event listeners
        socket.on("calendars_snapshot", onSnapshot);
        socket.on("calendar_update", onUpdate);

        // Ask for snapshot now and on reconnect
        const ask = () => socket.emit("calendars_get_snapshot", { userId });
        ask(); // on mount
        socket.on("connect", ask); // on reconnect

        return () => {
            socket.off("calendars_snapshot", onSnapshot);
            socket.off("calendar_update", onUpdate);
            socket.off("connect", ask);
        };
    }, [socket, userId]);

    return { calendar };
}
