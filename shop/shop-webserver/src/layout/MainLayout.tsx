import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppShell, Burger, Container, Group, Title } from "@mantine/core";
import { IconBox, IconCalendar, IconHome } from "@tabler/icons-react";
import { SidebarNav, type SidebarLink } from "../components/SidebarNav";
import { ConnectionBadge } from "../components/ConnectionBadge";
import { useBus } from "../hooks/useBus";


const USER_ID = "user123"; // replace with real auth later


const links: SidebarLink[] = [
    { to: "/", label: "Home", icon: IconHome, match: (p: string) => p === "/" },
    { to: "/orders", label: "Orders", icon: IconBox, match: (p: string) => p.startsWith("/orders") },
    { to: "/calendar", label: "Calendar", icon: IconCalendar, match: (p: string) => p.startsWith("/calendar") },
];


export default function MainLayout() {
    const [opened, setOpened] = useState(false);
    const { connected } = useBus({ userId: USER_ID });
    const location = useLocation();


    return (
        <AppShell header={{ height: 56 }} navbar={{ width: 240, breakpoint: "sm", collapsed: { mobile: !opened } }} padding="md">
            <AppShell.Header>
                <Container size="lg" style={{ height: "100%" }}>
                    <Group justify="space-between" align="center" style={{ height: "100%" }}>
                        <Group gap="sm" align="center">
                            <Burger opened={opened} onClick={() => setOpened((o) => !o)} hiddenFrom="sm" size="sm" />
                            <Title order={4}>Shop Admin</Title>
                        </Group>
                        <ConnectionBadge connected={connected} />
                    </Group>
                </Container>
            </AppShell.Header>


            <AppShell.Navbar p="xs">
                <SidebarNav currentPath={location.pathname} links={links} />
            </AppShell.Navbar>


            <AppShell.Main>
                <Container size="lg">
                    <Outlet />
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}