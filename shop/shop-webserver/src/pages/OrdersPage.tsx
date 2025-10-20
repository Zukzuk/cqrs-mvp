import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActionIcon,
    Badge,
    Button,
    Card,
    CopyButton,
    Group,
    Loader,
    Table,
    Text,
    Tooltip,
    rem,
} from "@mantine/core";
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { TOrderStatus } from "@daveloper/interfaces";

// --- local drop-in StatusBadge (or swap for your shared component) ---
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
        return (
            <Badge w={100} color="red" variant="light">
                Failed
            </Badge>
        );
    }
    if (normalized.includes("ship")) {
        return (
            <Badge w={100} color="teal" variant="light">
                Shipped
            </Badge>
        );
    }
    if (normalized.includes("complete")) {
        return (
            <Badge w={100} color="teal" variant="light">
                Completed
            </Badge>
        );
    }
    if (normalized.includes("create")) {
        return (
            <Badge w={100} color="cyan" variant="light">
                Created
            </Badge>
        );
    }
    return (
        <Badge w={100} color="blue" variant="light">
            {status || "Created"}
        </Badge>
    );
}

// ----------------------------------------

type Row = {
    orderId: string;
    userId: string;
    status: TOrderStatus;
    correlationId: string;
    pending?: boolean;
    updatedAt?: number;
};

const USER_ID = "user-123"; // replace with real auth later

export default function OrdersPage() {
    const socketRef = useRef<Socket | null>(null);

    const [rows, setRows] = useState<Row[]>([]);
    const byOrderIdRef = useRef<Map<string, number>>(new Map());
    const byCorrIdRef = useRef<Map<string, number>>(new Map());

    // Socket connection for orders domain
    useEffect(() => {
        const socket = io("/", {
            path: "/socket.io",
            transports: ["websocket"],
            auth: { userId: USER_ID },
        });
        socketRef.current = socket;

        const onSnapshot = (orders: any[]) => {
            orders.forEach((o) => upsert(o, { pending: false }));
        };
        const onUpdate = (update: any) => {
            upsert(update, { pending: false });
        };

        socket.on("orders_snapshot", onSnapshot);
        socket.on("order_update", onUpdate);

        return () => {
            socket.off("orders_snapshot", onSnapshot);
            socket.off("order_update", onUpdate);
            socket.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const upsert = (
        input: Row,
        { pending = false, reuseIndex = null as number | null } = {}
    ) => {
        setRows((prev) => {
            const list = [...prev];
            const now = Date.now();
            const item: Row = {
                orderId: input.orderId,
                userId: input.userId,
                status: input.status || "PENDING",
                correlationId: input.correlationId,
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
                const [rec] = list.splice(idx, 1);
                list.unshift(rec);
            } else {
                list.unshift(item);
            }

            byOrderId.clear();
            byCorrId.clear();
            list.forEach((r, i) => {
                if (r.orderId != null) byOrderId.set(String(r.orderId), i);
                if (r.correlationId) byCorrId.set(r.correlationId, i);
            });

            return list;
        });
    };

    // Commands
    const createOrder = () => {
        const provisionalOrderId = Date.now().toString();
        const correlationId = uuidv4();
        const cmd = { type: "CreateOrder", payload: { orderId: provisionalOrderId, total: 1 }, correlationId };

        const s = socketRef.current;
        if (!s) return;

        s.emit("order_command", cmd, (ack: any) => {
            if (ack && ack.status === "ok") {
                upsert({ orderId: provisionalOrderId, userId: USER_ID, status: "PENDING" as TOrderStatus, correlationId }, { pending: true });
            } else {
                upsert({ orderId: provisionalOrderId, userId: USER_ID, status: "FAILED" as TOrderStatus, correlationId }, { pending: false });
            }
        });
    };

    const shipOrder = (orderId: string, correlationId: string) => {
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

        const s = socketRef.current;
        if (!s) return;

        upsert({ orderId, userId: USER_ID, status: "PENDING" as TOrderStatus, correlationId }, { pending: true });

        s.emit("order_command", cmd, (ack: any) => {
            if (!(ack && ack.status === "ok")) {
                upsert({ orderId, userId: USER_ID, status: "FAILED" as TOrderStatus, correlationId }, { pending: false });
            }
        });
    };

    const renderActions = (r: Row) => {
        const normalized = (r.status || "").toUpperCase();
        const canShip = normalized.includes("CREATE") && !r.pending;

        return (
            <Group gap="xs" justify="flex-start" wrap="nowrap">
                <Tooltip label={canShip ? "Mark as SHIPPED" : "No actions"}>
                    <span>
                        <Button size="xs" variant="light" disabled={!canShip} onClick={() => shipOrder(r.orderId, r.correlationId as string)}>
                            Ship
                        </Button>
                    </span>
                </Tooltip>
            </Group>
        );
    };

    const tableRows = useMemo(
        () =>
            rows.map((r: Row) => (
                <Table.Tr key={(r.correlationId || r.orderId || Math.random()).toString()}>
                    <Table.Td>
                        <Text style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}>
                            {r.orderId != null ? `#${r.orderId}` : "#—"}
                        </Text>
                    </Table.Td>
                    <Table.Td>{r.userId}</Table.Td>
                    <Table.Td>
                        <StatusBadge status={r.status} pending={r.pending} />
                    </Table.Td>
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
                            <Text c="dimmed" size="sm">
                                —
                            </Text>
                        )}
                    </Table.Td>
                    <Table.Td>
                        <Text c="dimmed" size="sm">
                            {r.updatedAt ? new Date(r.updatedAt).toLocaleTimeString() : ""}
                        </Text>
                    </Table.Td>
                    <Table.Td>{renderActions(r)}</Table.Td>
                </Table.Tr>
            )),
        [rows]
    );

    return (
        <Card withBorder radius="md" shadow="sm">
            <Card.Section inheritPadding py="sm">
                <Group justify="space-between">
                    <Text fw={600}>Orders</Text>
                    <Button onClick={createOrder}>Create Order</Button>
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
                        {tableRows.length ? (
                            tableRows
                        ) : (
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
    );
}
