import React from "react";
import { Container, Loader } from "@mantine/core";
import Markdown from "../components/Markdown";

export default function HomePage() {
    const [content, setContent] = React.useState<string | null>(null);

    React.useEffect(() => {
        fetch("/README.md")
            .then((r) => r.text())
            .then(setContent)
            .catch(() => setContent("# README not found"));
    }, []);

    if (!content) return <Loader />;

    return (
        <Container size="md" py="lg">
            <Markdown content={content} />
        </Container>
    );
}
