import React, { useEffect, useState } from "react";
import { AppShell, Card, Center, Container, Loader, Text, Title, TypographyStylesProvider } from "@mantine/core";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders README.md dynamically by fetching /README.md (works in dev & prod).
// Put your README.md in /public so Vite serves it at /README.md and hot reloads on changes.

const fallbackReadme = `# Welcome 👋\n\nAdd a **README.md** in **/public** and it will render here (hot‑reloads in dev).`;

export default function HomePage() {
    const [readme, setReadme] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("/README.md", { cache: "no-store" });
                if (res.ok) {
                    setReadme(await res.text());
                    return;
                }
            } catch { }
            setReadme(null);
        };

        load().finally(() => setLoading(false));
    }, []);

    return (
        <AppShell padding="xl">
            <AppShell.Main>
                <Container size="md">
                    <Title order={1} mb="md" ta="center">Documentation</Title>
                    <Card withBorder radius="lg" shadow="sm" p="lg">
                        {loading ? (
                            <Center h={200}>
                                <Loader size="lg" />
                            </Center>
                        ) : (
                            <TypographyStylesProvider>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme ?? fallbackReadme}</ReactMarkdown>
                            </TypographyStylesProvider>
                        )}
                    </Card>
                    {!readme && !loading && (
                        <Text c="dimmed" mt="md" ta="center">
                            Tip: Place <code>README.md</code> in <code>/public</code> so it can update without rebuilding.
                        </Text>
                    )}
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}