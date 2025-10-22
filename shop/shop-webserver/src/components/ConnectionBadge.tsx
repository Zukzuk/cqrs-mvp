import { Badge } from "@mantine/core";

export function ConnectionBadge({ connected }: { connected: boolean }) {
    return <Badge variant="light" color={connected ? "green" : "red"}>{connected ? "Connected" : "Offline"}</Badge>;
}