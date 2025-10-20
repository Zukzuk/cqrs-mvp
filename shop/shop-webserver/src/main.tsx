import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import MainLayout from "./layout/MainLayout";
import OrdersPage from "./pages/OrdersPage";
import CalendarPage from "./pages/CalendarPage";

import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";

const router = createBrowserRouter([
    {
        element: <MainLayout />,
        children: [
            { path: "orders", element: <OrdersPage /> },
            { path: "calendar", element: <CalendarPage /> },
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
