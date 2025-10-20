import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Center,
    Divider,
    Group,
    Modal,
    Paper,
    Stack,
    Text,
    TextInput,
    Timeline,
    rem,
    Tooltip,
} from "@mantine/core";
import { DateTimePicker, Calendar } from "@mantine/dates";
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import {
    CalendarDocument,
    ICreateCalendarCommand,
    IRemoveScheduledTimeslotCommand,
    IRescheduleTimeslotCommand,
    IScheduleTimeslotCommand,
    TTimeslot,
} from "@daveloper/interfaces";
import { IconCalendarPlus, IconPlus, IconTrash, IconX } from "@tabler/icons-react";

const USER_ID = "user-123"; // replace with real auth later

function formatTimeRange(startIso: string, endIso: string) {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
    return `${s.toLocaleTimeString([], opts)}–${e.toLocaleTimeString([], opts)}`;
}

export default function CalendarPage() {
    const socketRef = useRef<Socket | null>(null);
    const [view, setView] = useState<CalendarDocument | null>(null);

    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [start, setStart] = useState<Date | null>(null);
    const [end, setEnd] = useState<Date | null>(null);

    // Domain socket for calendar events
    useEffect(() => {
        const s = io("/", {
            path: "/socket.io",
            transports: ["websocket"],
            auth: { userId: USER_ID },
        });

        socketRef.current = s;

        const onSnapshot = (payload: CalendarDocument) => setView(payload);
        const onUpdate = (
            payload: Partial<CalendarDocument> & { timeslot?: TTimeslot; removeTimeslotId?: string }
        ) => {
            setView((prev) => {
                if (!prev) return null;

                if (payload.timeslot) {
                    const exists = prev.timeslots.find((t) => t.timeslotId === payload.timeslot!.timeslotId);
                    const timeslots = exists
                        ? prev.timeslots.map((t) => (t.timeslotId === payload.timeslot!.timeslotId ? payload.timeslot! : t))
                        : [...prev.timeslots, payload.timeslot];
                    return { ...prev, timeslots, updatedAt: new Date().toISOString() };
                }

                if (payload.removeTimeslotId) {
                    return {
                        ...prev,
                        timeslots: prev.timeslots.filter((t) => t.timeslotId !== payload.removeTimeslotId),
                        updatedAt: new Date().toISOString(),
                    };
                }

                return { ...prev, ...payload };
            });
        };

        s.on("calendars_snapshot", onSnapshot);
        s.on("calendar_update", onUpdate);

        return () => {
            s.off("calendars_snapshot", onSnapshot);
            s.off("calendar_update", onUpdate);
            s.disconnect();
        };
    }, []);

    const timeslotsByDay = useMemo(() => {
        if (!view) return {};
        const map: Record<string, TTimeslot[]> = {};
        for (const t of view.timeslots) {
            const key = new Date(t.start).toDateString();
            (map[key] ||= []).push(t);
        }
        Object.keys(map).forEach((k) =>
            map[k].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        );
        return map;
    }, [view]);

    const selectedDayKey = useMemo(() => (start ? start.toDateString() : null), [start]);
    const selectedDaySlots = useMemo(
        () => (selectedDayKey ? timeslotsByDay[selectedDayKey] || [] : []),
        [timeslotsByDay, selectedDayKey]
    );

    const sendCommand = async (
        cmd:
            | ICreateCalendarCommand
            | IScheduleTimeslotCommand
            | IRescheduleTimeslotCommand
            | IRemoveScheduledTimeslotCommand
    ) => {
        return new Promise<void>((resolve, reject) => {
            socketRef.current?.emit("calendar_command", cmd, (ack: any) => {
                if (ack?.status === "ok") return resolve();
                reject(new Error(ack?.error || "Command failed"));
            });
        });
    };

    const schedule = async () => {
        if (!start || !end || !title) return;

        const cmd: IScheduleTimeslotCommand = {
            type: "ScheduleTimeslot",
            payload: {
                calendarId: USER_ID,
                timeslotId: uuidv4(),
                title,
                start: start.toISOString(),
                end: end.toISOString(),
            },
            correlationId: crypto.randomUUID(),
        };

        await sendCommand(cmd);
        setOpen(false);
        setTitle("");
        setEnd(null); // keep selected day; clear end for next add
    };

    const remove = async (timeslotId: string) => {
        const cmd: IRemoveScheduledTimeslotCommand = {
            type: "RemoveScheduledTimeslot",
            payload: { calendarId: USER_ID, timeslotId },
            correlationId: crypto.randomUUID(),
        };
        await sendCommand(cmd);
    };

    // dot indicators
    const daysWithSlots = useMemo(() => new Set(Object.keys(timeslotsByDay)), [timeslotsByDay]);

    return (
        <Card withBorder radius="md" shadow="sm">
            <Card.Section inheritPadding py="sm">
                <Group justify="space-between" align="center">
                    <Text fw={600}>Month view</Text>
                    {view ? (
                        <Badge variant="light" color="blue">
                            {view.timeslots.length} timeslot{view.timeslots.length === 1 ? "" : "s"}
                        </Badge>
                    ) : (
                        <Badge variant="light" color="gray">
                            Loading…
                        </Badge>
                    )}
                </Group>
            </Card.Section>

            <Card.Section p="md">
                <Calendar
                    getDayProps={(date) => {
                        const key = date.toDateString();
                        const selected =
                            !!start &&
                            date.getFullYear() === start.getFullYear() &&
                            date.getMonth() === start.getMonth() &&
                            date.getDate() === start.getDate();

                        const hasSlots = daysWithSlots.has(key);

                        return {
                            selected,
                            onClick: () => setStart(date),
                            renderDay: (day) => (
                                <Stack gap={2} align="center">
                                    <Text size="sm">{day.getDate()}</Text>
                                    {hasSlots && (
                                        <div
                                            style={{
                                                width: rem(6),
                                                height: rem(6),
                                                borderRadius: "50%",
                                                background: "var(--mantine-color-blue-6)",
                                            }}
                                        />
                                    )}
                                </Stack>
                            ),
                        };
                    }}
                />
            </Card.Section>

            <Divider />

            <Card.Section p="md">
                {!start ? (
                    <Center py="xl">
                        <Stack align="center" gap="xs">
                            <Text c="dimmed">Select a day to see scheduled timeslots</Text>
                            <Button leftSection={<IconCalendarPlus size={16} />} onClick={() => setOpen(true)}>
                                New timeslot
                            </Button>
                        </Stack>
                    </Center>
                ) : (
                    <Stack>
                        <Group justify="space-between" align="center">
                            <Text fw={600}>Selected day: {start.toDateString()}</Text>
                            <Group gap="xs">
                                <Tooltip label="Clear selected day">
                                    <ActionIcon variant="subtle" onClick={() => setStart(null)} aria-label="Clear selection">
                                        <IconX size={16} />
                                    </ActionIcon>
                                </Tooltip>
                                <Button variant="light" leftSection={<IconPlus size={16} />} onClick={() => setOpen(true)}>
                                    Schedule
                                </Button>
                            </Group>
                        </Group>

                        {selectedDaySlots.length === 0 ? (
                            <Paper withBorder p="md" radius="md">
                                <Text c="dimmed">No timeslots yet for this day. Click “Schedule” to add one.</Text>
                            </Paper>
                        ) : (
                            <Timeline bulletSize={16} lineWidth={2}>
                                {selectedDaySlots.map((t) => (
                                    <Timeline.Item
                                        key={t.timeslotId}
                                        title={<Text fw={600}>{t.title}</Text>}
                                        bullet={
                                            <div
                                                style={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: "50%",
                                                    background: "var(--mantine-color-blue-6)",
                                                }}
                                            />
                                        }
                                    >
                                        <Group justify="space-between" align="center" wrap="nowrap">
                                            <Text size="sm" c="dimmed">
                                                {formatTimeRange(t.start, t.end)}
                                            </Text>
                                            <Tooltip label="Remove">
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="red"
                                                    onClick={() => remove(t.timeslotId)}
                                                    aria-label="Remove timeslot"
                                                >
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>
                                    </Timeline.Item>
                                ))}
                            </Timeline>
                        )}
                    </Stack>
                )}
            </Card.Section>

            <Modal opened={open} onClose={() => setOpen(false)} title="Schedule timeslot" size="lg" withinPortal>
                <Stack>
                    <TextInput
                        label="Title"
                        placeholder="e.g., Product demo"
                        value={title}
                        onChange={(e) => setTitle(e.currentTarget.value)}
                        required
                    />
                    <Group grow align="flex-end">
                        <DateTimePicker label="Start" value={start} onChange={setStart} withSeconds required clearable />
                        <DateTimePicker label="End" value={end} onChange={setEnd} withSeconds required clearable minDate={start ?? undefined} />
                    </Group>

                    <Group justify="space-between" mt="sm">
                        <Text size="sm" c="dimmed">
                            {start && end ? formatTimeRange(start.toISOString(), end.toISOString()) : "Pick start and end times"}
                        </Text>
                        <Group>
                            <Button variant="default" onClick={() => { setTitle(""); setEnd(null); }}>
                                Reset
                            </Button>
                            <Button onClick={schedule} disabled={!title || !start || !end}>
                                Save
                            </Button>
                        </Group>
                    </Group>
                </Stack>
            </Modal>
        </Card>
    );
}
