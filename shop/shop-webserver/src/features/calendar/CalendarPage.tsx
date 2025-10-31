import { useMemo, useState } from "react";
import { Button, Group, Modal, Stack, Table, Text, TextInput, Title, Badge, Tooltip } from "@mantine/core";
import type { TTimeslot, CalendarDocument } from "@daveloper/interfaces";
import { Calendar, DateTimePicker } from "@mantine/dates";
import dayjs from "dayjs";
import { v4 as uuid } from "uuid";

import { useCalendarProjection } from "./useCalendarProjection";
import { CalendarCommands } from "./CalendarCommands";
import { useCalendarCommand } from "./useCalendarCommands";

import type { TTimeslot } from "@daveloper/interfaces";

type Props = { userId: string };

export default function CalendarPage({ userId }: Props) {
    const { calendar } = useCalendarProjection(userId);
    const hasCalendar = !!calendar;
    const timeslots = calendar?.timeslots ?? [];

    // selected day in the Mantine Calendar
    const [selected, setSelected] = useState<Date | null>(new Date());
    const selectedKey = useMemo(() => (selected ? dayjs(selected).format("YYYY-MM-DD") : ""), [selected]);

    // group timeslots by day
    const byDay = useMemo(() => {
        const map = new Map<string, TTimeslot[]>();
        for (const t of timeslots) {
            const key = dayjs(t.start).format("YYYY-MM-DD");
            const arr = map.get(key) ?? [];
            arr.push(t);
            map.set(key, arr);
        }
        for (const [k, arr] of map) {
            arr.sort((a, b) => a.start.localeCompare(b.start));
            map.set(k, arr);
        }
        return map;
    }, [timeslots]);

    // modal state for scheduling/editing
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [location, setLocation] = useState("");
    const [description, setDescription] = useState("");
    const [start, setStart] = useState<Date | null>(new Date());
    const [end, setEnd] = useState<Date | null>(dayjs().add(1, "hour").toDate());

    function openCreate(presetDate?: Date | null) {
        setEditingId(null);
        const s = (presetDate ?? selected ?? new Date());
        const base = dayjs(s).hour(9).minute(0).second(0).millisecond(0);
        setTitle("");
        setLocation("");
        setDescription("");
        setStart(base.toDate());
        setEnd(base.add(1, "hour").toDate());
        setOpen(true);
    }

    function openEdit(id: string) {
        const t = timeslots.find(x => x.timeslotId === id);
        if (!t) return;
        setEditingId(id);
        setTitle(t.title || "");
        setLocation(t.location || "");
        setDescription(t.description || "");
        setStart(new Date(t.start));
        setEnd(new Date(t.end));
        setOpen(true);
    }

    async function ensureCalendarExists() {
        if (hasCalendar) return;
        const cmd = CalendarCommands.createCalendar(userId);
        try { await useCalendarCommand(userId, cmd); } catch { }
    }

    async function onSave() {
        if (!start || !end || end <= start) return;
        if (!hasCalendar) await ensureCalendarExists();

        if (editingId) {
            const cmd = CalendarCommands.rescheduleTimeslot({
                calendarId: userId,
                timeslotId: editingId,
                start: start.toISOString(),
                end: end.toISOString(),
            });
            try { await useCalendarCommand(userId, cmd); } catch { }
        } else {
            const id = uuid();
            const cmd = CalendarCommands.scheduleTimeslot({
                calendarId: userId,
                timeslotId: id,
                title: title || "",
                start: start.toISOString(),
                end: end.toISOString(),
                location: location || undefined,
                description: description || undefined,
            });
            try { await useCalendarCommand(userId, cmd); } catch { }
        }
        setOpen(false);
    }

    async function onRemoveTimeslot(id: string) {
        const cmd = CalendarCommands.removeTimeslot({ calendarId: userId, timeslotId: id });
        try { await useCalendarCommand(userId, cmd); } catch { }
    }

    async function onRemoveCalendar() {
        if (!hasCalendar) return;
        const cmd = CalendarCommands.removeCalendar(userId);
        try { await useCalendarCommand(userId, cmd); } catch { }
    }

    const renderDay = (date: Date) => {
        const key = dayjs(date).format("YYYY-MM-DD");
        const list = byDay.get(key) ?? [];
        if (list.length === 0) return <span>{dayjs(date).date()}</span>;
        return (
            <Group gap={4} wrap="nowrap">
                <span>{dayjs(date).date()}</span>
                <Tooltip label={`${list.length} scheduled`} withArrow>
                    <Badge size="xs" variant="filled">{list.length}</Badge>
                </Tooltip>
            </Group>
        );
    };

    const selectedList = byDay.get(selectedKey) ?? [];

    return (
        <Stack>
            <Group justify="space-between" align="center">
                <Group>
                    <Title order={3}>Calendar</Title>
                    <Text c="dimmed">{dayjs(selected ?? new Date()).format("MMMM YYYY")}</Text>
                </Group>
                <Group>
                    {!hasCalendar ? (
                        <Button onClick={ensureCalendarExists}>Create calendar</Button>
                    ) : (
                        <>
                            <Button onClick={() => openCreate(selected)}>New timeslot</Button>
                            <Button color="red" variant="light" onClick={onRemoveCalendar}>Remove calendar</Button>
                        </>
                    )}
                </Group>
            </Group>

            {!hasCalendar ? (
                <Text c="dimmed">You don’t have a calendar yet. Click “Create calendar”.</Text>
            ) : (
                <>
                    <Calendar
                        value={selected}
                        onChange={(d) => setSelected(d)}
                        withCellSpacing
                        allowDeselect={false}
                        renderDay={renderDay}
                    />

                    <DayEventsTable
                        dateISO={selectedKey}
                        items={selectedList}
                        onCreate={() => openCreate(selected)}
                        onEdit={openEdit}
                        onRemove={onRemoveTimeslot}
                    />
                </>
            )}

            <Modal
                opened={open}
                onClose={() => setOpen(false)}
                title={editingId ? "Edit timeslot" : "New timeslot"}
                centered
            >
                <Stack>
                    {!editingId && (
                        <TextInput label="Title" value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
                    )}
                    <DateTimePicker label="Start" value={start} onChange={setStart} withSeconds />
                    <DateTimePicker label="End" value={end} onChange={setEnd} withSeconds minDate={start ?? undefined} />
                    {!editingId && (
                        <>
                            <TextInput label="Location" value={location} onChange={(e) => setLocation(e.currentTarget.value)} />
                            <TextInput label="Description" value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
                        </>
                    )}
                    <Group justify="flex-end">
                        <Button variant="light" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={onSave} disabled={!start || !end || end <= start}>Save</Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
}

function DayEventsTable({
    dateISO,
    items,
    onCreate,
    onEdit,
    onRemove,
}: {
    dateISO: string;
    items: TTimeslot[];
    onCreate: () => void;
    onEdit: (id: string) => void;
    onRemove: (id: string) => void;
}) {
    const label = dayjs(dateISO || new Date()).format("dddd, MMM D, YYYY");
    const sorted = useMemo(() => [...items].sort((a, b) => a.start.localeCompare(b.start)), [items]);

    return (
        <Stack>
            <Group justify="space-between" align="center">
                <Text fw={600}>{label}</Text>
                <Button size="xs" variant="subtle" onClick={onCreate}>New timeslot</Button>
            </Group>

            {sorted.length === 0 ? (
                <Text c="dimmed">No timeslots for this day.</Text>
            ) : (
                <Table withTableBorder highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Start</Table.Th>
                            <Table.Th>End</Table.Th>
                            <Table.Th>Title</Table.Th>
                            <Table.Th>Location</Table.Th>
                            <Table.Th style={{ width: 180 }}></Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {sorted.map((t) => (
                            <Table.Tr key={t.timeslotId}>
                                <Table.Td>{dayjs(t.start).format("HH:mm")}</Table.Td>
                                <Table.Td>{dayjs(t.end).format("HH:mm")}</Table.Td>
                                <Table.Td>{t.title || "—"}</Table.Td>
                                <Table.Td>{t.location || "—"}</Table.Td>
                                <Table.Td>
                                    <Group gap="xs" justify="flex-end">
                                        <Button size="xs" variant="light" onClick={() => onEdit(t.timeslotId)}>Edit</Button>
                                        <Button size="xs" variant="light" color="red" onClick={() => onRemove(t.timeslotId)}>Remove</Button>
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            )}
        </Stack>
    );
}
