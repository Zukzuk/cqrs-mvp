import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import MainLayout from "./layout/MainLayout";
import HomePage from "./layout/HomePage";
import OrdersPage from "./features/orders/OrdersPage";
import { IconBox, IconHome } from "@tabler/icons-react";
import { SidebarLink } from "./components/SidebarNav";

import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";

export const links: SidebarLink[] = [
    { to: "/", label: "Home", icon: IconHome, match: (p: string) => p === "/" },
    { to: "/orders", label: "Orders", icon: IconBox, match: (p: string) => p.startsWith("/orders") },
];

const USER_ID = "user123"; // TODO: replace with real authenticated user ID

const router = createBrowserRouter([
    {
        element: <MainLayout userId={USER_ID} />,
        children: [
            { path: links[0].to, element: <HomePage /> },
            { path: links[1].to, element: <OrdersPage userId={USER_ID} /> },
        ],
    },
]);

function App() {
    return (
        <MantineProvider defaultColorScheme="dark">
            <Notifications />
            <RouterProvider router={router} />
        </MantineProvider>
    );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
