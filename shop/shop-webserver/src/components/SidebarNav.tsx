// components/SidebarNav.tsx
import { Stack, NavLink } from "@mantine/core";
import { NavLink as RouterNavLink } from "react-router-dom";
import type { ElementType } from "react";

export type SidebarLink = {
    to: string;
    label: string;
    icon: ElementType;
    match: (path: string) => boolean;
};

export function SidebarNav({ currentPath, links }: { currentPath: string; links: SidebarLink[] }) {
    return (
        <Stack gap={2}>
            {links.map(({ to, label, icon: Icon, match }) => (
                <NavLink
                    key={to}
                    component={RouterNavLink}
                    to={to}
                    label={label}
                    leftSection={<Icon size={16} />} // Tabler supports number | string, so 16 is fine
                    active={match(currentPath)}
                    variant="light"
                />
            ))}
        </Stack>
    );
}
