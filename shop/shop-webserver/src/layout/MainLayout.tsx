import { useState } from "react";
import { Outlet, NavLink as RouterNavLink, useLocation } from "react-router-dom";
import {
    AppShell,
    Badge,
    Burger,
    Container,
    Group,
    NavLink,
    Stack,
    Title,
} from "@mantine/core";
import { IconBox, IconCalendar, IconCreditCard, IconHome, IconSettings } from "@tabler/icons-react";
import { useSocket } from "../hooks/useSocket";

const USER_ID = "user-123"; // replace with real auth later

export default function MainLayout() {
    const [opened, setOpened] = useState(false);
    const { connected } = useSocket(USER_ID);
    const location = useLocation();

    return (
        <AppShell
            header={{ height: 56 }}
            navbar={{ width: 240, breakpoint: "sm", collapsed: { mobile: !opened } }}
            padding="md"
        >
            {/* Header with title + connected badge */}
            <AppShell.Header>
                <Container size="lg" style={{ height: "100%" }}>
                    <Group justify="space-between" align="center" style={{ height: "100%" }}>
                        <Group gap="sm" align="center">
                            <Burger opened={opened} onClick={() => setOpened((o) => !o)} hiddenFrom="sm" size="sm" />
                            <Title order={4}>Shop Admin</Title>
                        </Group>
                        <Badge variant="light" color={connected ? "green" : "red"}>
                            {connected ? "Connected" : "Offline"}
                        </Badge>
                    </Group>
                </Container>
            </AppShell.Header>

            {/* Left main menu */}
            <AppShell.Navbar p="xs">
                <Stack gap={2}>
                    <NavLink
                        component={RouterNavLink}
                        to="/orders"
                        label="Orders"
                        leftSection={<IconBox size={16} />}
                        active={location.pathname.startsWith("/orders")}
                        variant="light"
                    />
                    <NavLink
                        component={RouterNavLink}
                        to="/calendar"
                        label="Calendar"
                        leftSection={<IconCalendar size={16} />}
                        active={location.pathname.startsWith("/calendar")}
                        variant="light"
                    />
                </Stack>
            </AppShell.Navbar>

            {/* Main container with page content */}
            <AppShell.Main>
                <Container size="lg">
                    <Outlet />
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
