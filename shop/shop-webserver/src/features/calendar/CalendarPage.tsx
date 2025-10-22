import { useMemo, useState } from "react";
import { Button, Group, Modal, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { v4 as uuid } from "uuid";
import { useCalendarProjection } from "./useCalendarProjection";
import { sendCalendarCommand } from "./useCalendarCommands";
import { CalendarCommands } from "./CalendarCommands";

const USER_ID = "user123"; // replace when auth lands; BFF overwrites calendarId to userId anyway

export default function CalendarPage() {
    const { calendar } = useCalendarProjection(USER_ID);
    const [opened, setOpened] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [start, setStart] = useState<Date | null>(null);
    const [end, setEnd] = useState<Date | null>(null);
    const [location, setLocation] = useState("");
    const [description, setDescription] = useState("");

    const timeslots = useMemo(() => (calendar?.timeslots ?? []).slice().sort((a, b) => a.start.localeCompare(b.start)), [calendar]);

    async function ensureCalendarExists() {
        // Projection service already snapshots an empty calendar when missing, but command is harmless if aggregate needs creation.
        await sendCalendarCommand(USER_ID, CalendarCommands.createCalendar(USER_ID));
    }

    function openCreate() {
        setEditingId(null); setTitle(""); setStart(null); setEnd(null); setLocation(""); setDescription(""); setOpened(true);
    }
    function openEdit(id: string) {
        const t = timeslots.find(x => x.timeslotId === id); if (!t) return;
        setEditingId(id); setTitle(t.title || ""); setStart(new Date(t.start)); setEnd(new Date(t.end)); setLocation(t.location || ""); setDescription(t.description || ""); setOpened(true);
    }

    async function onSave() {
        if (!start || !end || end <= start) return;
        if (!calendar) await ensureCalendarExists();
        if (editingId) {
            await sendCalendarCommand(USER_ID, CalendarCommands.rescheduleTimeslot({ calendarId: USER_ID, timeslotId: editingId, start: start.toISOString(), end: end.toISOString() }));
        } else {
            await sendCalendarCommand(USER_ID, CalendarCommands.scheduleTimeslot({
                calendarId: USER_ID,
                timeslotId: uuid(),
                title: title || "",
                start: start.toISOString(),
                end: end.toISOString(),
                location: location || undefined,
                description: description || undefined,
            }));
        }
        setOpened(false);
    }

    async function onRemoveTimeslot(id: string) {
        await sendCalendarCommand(USER_ID, CalendarCommands.removeTimeslot({ calendarId: USER_ID, timeslotId: id }));
    }

    async function onRemoveCalendar() {
        await sendCalendarCommand(USER_ID, CalendarCommands.removeCalendar(USER_ID));
    }

    return (
        <Stack>
            <Group justify="space-between" align="center">
                <Title order={3}>Calendar</Title>
                <Group>
                    <Button variant="light" onClick={ensureCalendarExists}>Create calendar</Button>
                    <Button color="red" variant="light" onClick={onRemoveCalendar}>Remove calendar</Button>
                    <Button onClick={openCreate}>Schedule timeslot</Button>
                </Group>
            </Group>

            {timeslots.length === 0 ? (
                <Text c="dimmed">No timeslots yet. Use "Schedule timeslot" to add one.</Text>
            ) : (
                <Table highlightOnHover withTableBorder>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Title</Table.Th>
                            <Table.Th>Start</Table.Th>
                            <Table.Th>End</Table.Th>
                            <Table.Th>Location</Table.Th>
                            <Table.Th style={{ width: 160 }}>Actions</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {timeslots.map((t) => (
                            <Table.Tr key={t.timeslotId}>
                                <Table.Td>{t.title || "—"}</Table.Td>
                                <Table.Td>{new Date(t.start).toLocaleString()}</Table.Td>
                                <Table.Td>{new Date(t.end).toLocaleString()}</Table.Td>
                                <Table.Td>{t.location || "—"}</Table.Td>
                                <Table.Td>
                                    <Group gap="xs">
                                        <Button size="xs" variant="light" onClick={() => openEdit(t.timeslotId)}>Reschedule</Button>
                                        <Button size="xs" variant="light" color="red" onClick={() => onRemoveTimeslot(t.timeslotId)}>Remove</Button>
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            )}

            <Modal opened={opened} onClose={() => setOpened(false)} title={editingId ? "Reschedule timeslot" : "Schedule timeslot"} centered>
                <Stack>
                    {!editingId && <TextInput label="Title" value={title} onChange={(e) => setTitle(e.currentTarget.value)} />}
                    <DateTimePicker label="Start" value={start} onChange={setStart} withSeconds />
                    <DateTimePicker label="End" value={end} onChange={setEnd} withSeconds minDate={start ?? undefined} />
                    {!editingId && (
                        <>
                            <TextInput label="Location" value={location} onChange={(e) => setLocation(e.currentTarget.value)} />
                            <TextInput label="Description" value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
                        </>
                    )}
                    <Group justify="flex-end">
                        <Button variant="light" onClick={() => setOpened(false)}>Cancel</Button>
                        <Button onClick={onSave} disabled={!start || !end || (start && end && end <= start)}>Save</Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
}