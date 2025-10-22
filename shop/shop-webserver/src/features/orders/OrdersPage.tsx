import { useEffect, useMemo } from "react";
import { Badge, Button, Group, Loader, Stack, Table, Text, Title } from "@mantine/core";
import { v4 as uuidv4 } from "uuid";
import { useOrdersProjection } from "./useOrdersProjection";
import { sendOrdersCommand } from "./useOrdersCommands";
import { OrdersCommands } from "./OrdersCommands";
import type { ShopOrdersDocument } from "@daveloper/interfaces";
import { useUpsertRows, type BaseRow } from "./useUpsertRows";

const USER_ID = "user123";

type Row = Pick<
    ShopOrdersDocument,
    "orderId" | "userId" | "status" | "total" | "carrier" | "trackingNumber" | "shippedAt" | "correlationId"
> & BaseRow;

export default function OrderPage() {
    const { orders: projectedOrders } = useOrdersProjection(USER_ID);
    const { rows, upsert, applyProjection } = useUpsertRows<Row>();

    // Feed projection into the hook
    useEffect(() => {
        if (projectedOrders?.length) {
            // mark incoming as non-pending; hook merges by correlationId/orderId
            applyProjection(projectedOrders as Row[]);
        }
    }, [projectedOrders, applyProjection]);

    const createOrder = async () => {
        const orderId = Date.now().toString();
        const payload = { orderId, userId: USER_ID, total: 1 };
        const correlationId = uuidv4();

        upsert({ ...payload, correlationId, status: "PENDING" }, { pending: true });

        const cmd = OrdersCommands.createOrder(payload);
        try {
            await sendOrdersCommand(USER_ID, { ...cmd, correlationId });
        } catch (err) {
            console.error("CreateOrder failed:", err);
            upsert({ ...payload, correlationId, status: "FAILED" }, { pending: false });
        }
    };

    const shipOrder = async (o: ShopOrdersDocument) => {
        if (!o.orderId) return;
        const { orderId, userId, correlationId } = o;
        const payload = {
            orderId,
            carrier: "DHL",
            trackingNumber: `TRACK-${orderId}`.slice(0, 20),
            shippedAt: new Date().toISOString(),
        };

        upsert({ ...payload, userId, correlationId, status: "PENDING" }, { pending: true });

        const cmd = OrdersCommands.shipOrder(payload);
        try {
            await sendOrdersCommand(USER_ID, { ...cmd, correlationId });
        } catch (err) {
            console.error("ShipOrder failed:", err);
            upsert({ ...payload, userId, correlationId, status: "FAILED" }, { pending: false });
        }
    };

    // Sorted view (shippedAt desc, then orderId)
    const view = useMemo(
        () =>
            rows.slice().sort((a, b) => {
                const aNoTs = !a.shippedAt;
                const bNoTs = !b.shippedAt;
                if (aNoTs !== bNoTs) return aNoTs ? -1 : 1; // no timestamp on top

                // both have timestamps → newest first
                if (!aNoTs && !bNoTs) {
                    const byShip = String(b.shippedAt!).localeCompare(String(a.shippedAt!));
                    if (byShip !== 0) return byShip;
                }

                // both missing shippedAt → fall back to updatedAt desc, then orderId asc
                const byUpdated = (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
                if (byUpdated !== 0) return byUpdated;

                return String(a.orderId ?? "").localeCompare(String(b.orderId ?? ""));
            }),
        [rows]
    );

    const statusColor = (status?: string) => {
        switch (status) {
            case "SHIPPED":
                return "Orchid";
            case "FAILED":
                return "Red";
            case "PENDING":
                return "Coral";
            case "CREATED":
                return "SpringGreen";
            default:
                return "RoyalBlue";
        }
    };

    return (
        <Stack>
            <Group justify="space-between" align="center">
                <Title order={3}>Orders</Title>
                <Button onClick={createOrder}>Create Order</Button>
            </Group>

            {view.length === 0 ? (
                <Text c="dimmed">
                    No orders yet — click <em>Create Order</em> to emit a <code>CreateOrder</code> command.
                </Text>
            ) : (
                <Table highlightOnHover withTableBorder>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Order ID</Table.Th>
                            <Table.Th>Correlation ID</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th>Total</Table.Th>
                            <Table.Th>Shipped At</Table.Th>
                            <Table.Th>Carrier</Table.Th>
                            <Table.Th>Tracking #</Table.Th>
                            <Table.Th>Actions</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {view.map((o, i) => {
                            const shipped = o.status === "SHIPPED" || !!o.shippedAt;
                            const isPending = !!o.pending || o.status === "PENDING";
                            return (
                                <Table.Tr key={`${o.correlationId ?? o.orderId}-${i}`}>
                                    <Table.Td>{o.orderId}</Table.Td>
                                    <Table.Td>{o.correlationId}</Table.Td>
                                    <Table.Td>
                                        <Badge
                                            color={statusColor(o.status)}
                                            variant="light"
                                            w={100}
                                            leftSection={isPending ? <Loader c="light" size={9} /> : undefined}
                                        >
                                            { o.status }
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>{o.total ?? "—"}</Table.Td>
                                    <Table.Td>{o.shippedAt ? new Date(o.shippedAt).toLocaleString() : "—"}</Table.Td>
                                    <Table.Td>{o.carrier ?? "—"}</Table.Td>
                                    <Table.Td>{o.trackingNumber ?? "—"}</Table.Td>
                                    <Table.Td>
                                        <Button
                                            size="xs"
                                            variant="light"
                                            onClick={() => shipOrder(o)}
                                            disabled={isPending || shipped}
                                        >
                                            Ship
                                        </Button>
                                    </Table.Td>
                                </Table.Tr>
                            );
                        })}
                    </Table.Tbody>
                </Table>
            )}
        </Stack>
    );
}
