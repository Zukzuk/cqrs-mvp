import { Badge, Loader } from "@mantine/core";

export function StatusBadge({ status, pending }: { status?: string; pending?: boolean }) {
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
