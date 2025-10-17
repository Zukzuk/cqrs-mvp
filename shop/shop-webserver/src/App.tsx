import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    MantineProvider, AppShell, Container, Group, Title, Button, Card, Table, Badge, Text,
    Loader, Tooltip, CopyButton, ActionIcon, rem
} from "@mantine/core";
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { IconCopy, IconCheck } from "@tabler/icons-react";
import { TOrderStatus } from "@daveloper/interfaces";

function StatusBadge({ status, pending }: { status?: string; pending?: boolean }) {
    const normalized = (status || "").toLowerCase();

    if (pending) {
        return (
            <Badge w={100} color="orange" variant="light" leftSection={<Loader size={10} type="oval" />}>
                Pending
            </Badge>
        );
    }
    if (normalized.includes("fail") || normalized.includes("error")) {
        return <Badge w={100} color="red" variant="light">Failed</Badge>;
    }
    if (normalized.includes("ship")) {
        return <Badge w={100} color="teal" variant="light">Shipped</Badge>;
    }
    if (normalized.includes("complete")) {
        return <Badge w={100} color="teal" variant="light">Completed</Badge>;
    }
    if (normalized.includes("create")) {
        return <Badge w={100} color="cyan" variant="light">Created</Badge>;
    }
    return <Badge w={100} color="blue" variant="light">{status || "Created"}</Badge>;
}

function useSocket(userId: string) {
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const socket = io("/", {
            path: "/socket.io",
            transports: ["websocket"],
            auth: { userId },
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
        });
        socketRef.current = socket;

        const onConnect = () => setConnected(true);
        const onDisconnect = () => setConnected(false);
        const onError = (err: any) => console.error("connect_error:", err?.message || err);

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("connect_error", onError);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("connect_error", onError);
            socket.disconnect();
        };
    }, [userId]);

    return { socket: socketRef, connected };
}

type Row = {
    orderId: number | string | null;
    userId: string;
    status: TOrderStatus;
    correlationId?: string | null;
    pending?: boolean;
    updatedAt: number;
};

export default function App() {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("userId") || "user123";
    const { socket, connected } = useSocket(userId);

    const [rows, setRows] = useState<Row[]>([]);
    const byOrderIdRef = useRef<Map<string, number>>(new Map());
    const byCorrIdRef = useRef<Map<string, number>>(new Map());

    const upsert = (
        input: Partial<Row>,
        { pending = false, reuseIndex = null as number | null } = {}
    ) => {
        setRows(prev => {
            const list = [...prev];
            const now = Date.now();
            const item: Row = {
                orderId: input.orderId ?? null,
                userId: input.userId ?? userId,
                status: (input.status as string) ?? (pending ? "PENDING" : "CREATED"),
                correlationId: input.correlationId ?? null,
                pending,
                updatedAt: now,
            };

            const byOrderId = byOrderIdRef.current;
            const byCorrId = byCorrIdRef.current;

            let idx = -1;
            if (reuseIndex !== null) idx = reuseIndex;
            else if (item.correlationId && byCorrId.has(item.correlationId)) idx = byCorrId.get(item.correlationId)!;
            else if (item.orderId != null && byOrderId.has(String(item.orderId))) idx = byOrderId.get(String(item.orderId))!;

            if (idx >= 0) {
                const merged = { ...list[idx], ...item, pending };
                list[idx] = merged;

                // move to top
                const [rec] = list.splice(idx, 1);
                list.unshift(rec);
            } else {
                // insert at top
                list.unshift(item);
            }

            // rebuild indexes
            byOrderId.clear(); byCorrId.clear();
            list.forEach((r, i) => {
                if (r.orderId != null) byOrderId.set(String(r.orderId), i);
                if (r.correlationId) byCorrId.set(r.correlationId, i);
            });

            return list;
        });
    };

    // Socket wires
    useEffect(() => {
        const s = socket.current;
        if (!s) return;

        const onSnapshot = (orders: any[]) => {
            orders.forEach((o) => upsert(o, { pending: false }));
        };
        const onUpdate = (update: any) => {
            upsert(update, { pending: false });
        };

        s.on("orders_snapshot", onSnapshot);
        s.on("order_update", onUpdate);

        return () => {
            s.off("orders_snapshot", onSnapshot);
            s.off("order_update", onUpdate);
        };
    }, [socket]);

    // Emit CreateOrder and add pending row on ACK
    const createOrder = () => {
        const provisionalOrderId = Date.now();
        const correlationId = uuidv4();
        const cmd = { type: "CreateOrder", payload: { orderId: provisionalOrderId, total: 1 }, correlationId };

        const s = socket.current;
        if (!s) return;

        s.emit("command", cmd, (ack: any) => {
            if (ack && ack.status === "ok") {
                upsert({ orderId: provisionalOrderId, userId, status: "PENDING", correlationId }, { pending: true });
            } else {
                upsert({ orderId: provisionalOrderId, userId, status: "FAILED", correlationId }, { pending: false });
            }
        });
    };

    // Emit ShipOrder for an existing orderId
    const shipOrder = (orderId: number | string | null, correlationId: number) => {
        if (orderId == null) return;
        const cmd = {
            type: "ShipOrder",
            payload: {
                orderId,
                carrier: "DHL",
                trackingNumber: `TRACK-${String(orderId)}`.slice(0, 20),
                shippedAt: new Date().toISOString(),
            },
            correlationId,
        };

        const s = socket.current;
        if (!s) return;

        // optimistic pending flag so the user sees immediate feedback
        upsert({ orderId, userId, status: "PENDING", correlationId }, { pending: true });

        s.emit("command", cmd, (ack: any) => {
            if (ack && ack.status === "ok") {
                // leave row as pending until projection pushes order_update with SHIPPED
            } else {
                upsert({ orderId, userId, status: "FAILED", correlationId }, { pending: false });
            }
        });
    };

    const renderActions = (r: Row) => {
        const normalized = (r.status || "").toUpperCase();

        // Only show Ship button when the order is CREATED and not pending
        const canShip = normalized.includes("CREATE") && !r.pending;

        return (
            <Group gap="xs" justify="flex-start" wrap="nowrap">
                <Tooltip label={canShip ? "Mark as SHIPPED" : "No actions"}>
                    <span>
                        <Button
                            size="xs"
                            variant="light"
                            disabled={!canShip}
                            onClick={() => shipOrder(r.orderId, r.correlationId)}
                        >
                            Ship
                        </Button>
                    </span>
                </Tooltip>
            </Group>
        );
    };

    const tableRows = useMemo(
        () =>
            rows.map((r) => (
                <Table.Tr key={(r.correlationId || r.orderId || Math.random()).toString()}>
                    <Table.Td>
                        <Text style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}>
                            {r.orderId != null ? `#${r.orderId}` : "#—"}
                        </Text>
                    </Table.Td>
                    <Table.Td>{r.userId}</Table.Td>
                    <Table.Td><StatusBadge status={r.status} pending={r.pending} /></Table.Td>
                    <Table.Td>
                        {r.correlationId ? (
                            <Group gap="xs" align="center" wrap="nowrap">
                                <Text
                                    size="sm"
                                    style={{
                                        maxWidth: rem(340),
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                                    }}
                                >
                                    {r.correlationId}
                                </Text>
                                <CopyButton value={r.correlationId} timeout={1200}>
                                    {({ copied, copy }) => (
                                        <Tooltip label={copied ? "Copied" : "Copy"}>
                                            <ActionIcon onClick={copy} variant="subtle" aria-label="Copy correlation id">
                                                {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                                            </ActionIcon>
                                        </Tooltip>
                                    )}
                                </CopyButton>
                            </Group>
                        ) : (
                            <Text c="dimmed" size="sm">—</Text>
                        )}
                    </Table.Td>
                    <Table.Td><Text c="dimmed" size="sm">{new Date(r.updatedAt).toLocaleTimeString()}</Text></Table.Td>
                    <Table.Td>{renderActions(r)}</Table.Td>
                </Table.Tr>
            )),
        [rows]
    );

    return (
        <MantineProvider defaultColorScheme="light">
            <AppShell padding="md" header={{ height: 60 }}>
                <AppShell.Header>
                    <Container size="lg">
                        <Group justify="space-between" py="sm">
                            <Title order={3}>Your Orders</Title>
                            <Group>
                                <Badge color={connected ? "green" : "red"} variant="light">
                                    {connected ? "Connected" : "Disconnected"}
                                </Badge>
                                <Button onClick={createOrder}>Create Order</Button>
                            </Group>
                        </Group>
                    </Container>
                </AppShell.Header>
                <AppShell.Main>
                    <Container size="lg">
                        <Card withBorder radius="md" shadow="sm">
                            <Card.Section inheritPadding py="sm">
                                <Group justify="space-between">
                                    <Text fw={600}>Orders</Text>
                                    <Text size="sm" c="dimmed">Latest on top</Text>
                                </Group>
                            </Card.Section>
                            <Card.Section>
                                <Table verticalSpacing="sm" striped highlightOnHover>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Order</Table.Th>
                                            <Table.Th>User</Table.Th>
                                            <Table.Th>Status</Table.Th>
                                            <Table.Th>Correlation ID</Table.Th>
                                            <Table.Th>Updated</Table.Th>
                                            <Table.Th>Actions</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {tableRows.length ? tableRows : (
                                            <Table.Tr>
                                                <Table.Td colSpan={6}>
                                                    <Text c="dimmed">No orders yet. Create one to get started.</Text>
                                                </Table.Td>
                                            </Table.Tr>
                                        )}
                                    </Table.Tbody>
                                </Table>
                            </Card.Section>
                        </Card>
                    </Container>
                </AppShell.Main>
            </AppShell>
        </MantineProvider>
    );
}
