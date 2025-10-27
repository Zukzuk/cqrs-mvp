import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppShell, Burger, Container, Group, Title } from "@mantine/core";
import { SidebarNav } from "../components/SidebarNav";
import { ConnectionBadge } from "../components/ConnectionBadge";
import { useBus } from "../hooks/useBus";
import { links } from "../main";

const USER_ID = "user123"; // replace with real auth later

export default function MainLayout() {
    const [opened, setOpened] = useState(false);
    const { connected } = useBus({ userId: USER_ID });
    const location = useLocation();

    return (
        <AppShell header={{ height: 56 }} navbar={{ width: 240, breakpoint: "sm", collapsed: { mobile: !opened } }} padding="md">
            <AppShell.Header>
                <Group align="center" style={{ height: "100%" }}>
                    <Group ml="sm" gap="sm" align="center">
                        <Burger
                            opened={opened}
                            onClick={() => setOpened((o) => !o)}
                            hiddenFrom="sm"
                            size="sm"
                        />
                        <Title order={4}>Shop Admin</Title>
                        <ConnectionBadge connected={connected} />
                    </Group>

                    <Group mr="sm" align="center" style={{ marginLeft: "auto" }}>
                        <span>{USER_ID}</span>
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar>
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