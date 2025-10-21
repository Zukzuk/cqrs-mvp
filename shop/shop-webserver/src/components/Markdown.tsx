import React from "react";
import {
    TypographyStylesProvider,
    Anchor as MantineAnchor,
    Code as MantineCode,
    ScrollArea,
    useMantineTheme,
    useMantineColorScheme,
} from "@mantine/core";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export default function Markdown({ content }: { content: string }) {
    const theme = useMantineTheme();
    const { colorScheme } = useMantineColorScheme();
    const border = colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3];
    const zebra = colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.gray[0];

    // --- Renderers ---
    // Links: filter props to avoid TS conflicts with Mantine Anchor
    const LinkRenderer: Components["a"] = ({ href, title, children }) => (
        <MantineAnchor href={href ?? "#"} title={title ?? undefined} target="_blank" rel="noreferrer">
            {children}
        </MantineAnchor>
    );

    // Inline code (since `inline` is no longer provided, `code` is for inline)
    const CodeRenderer: Components["code"] = ({ className, children, ...props }) => (
        <MantineCode {...props}>{children}</MantineCode>
    );

    // Fenced code blocks – handled in `pre`
    const PreRenderer: Components["pre"] = ({ children, ...props }) => (
        
        <ScrollArea.Autosize mah={420}>
            <pre
                {...props}
                style={{
                    padding: theme.spacing.md,
                    border: `1px solid ${border}`,
                    borderRadius: theme.radius.md,
                    margin: `${theme.spacing.sm} 0`,
                    overflow: "auto",
                }}
            >
                {children}
            </pre>
        </ScrollArea.Autosize>
    );

    // Tables
    const TableRenderer: Components["table"] = (props) => (
        <div style={{ overflowX: "auto", margin: `${theme.spacing.sm} 0` }}>
            <table
                style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    border: `1px solid ${border}`,
                }}
                {...props}
            />
        </div>
    );

    const ThRenderer: Components["th"] = (props) => (
        <th
            style={{
                textAlign: "left",
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                borderBottom: `1px solid ${border}`,
                borderRight: `1px solid ${border}`,
                background: zebra,
                fontWeight: 600,
                whiteSpace: "nowrap",
            }}
            {...props}
        />
    );

    const TdRenderer: Components["td"] = (props) => (
        <td
            style={{
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                borderBottom: `1px solid ${border}`,
                borderRight: `1px solid ${border}`,
                verticalAlign: "top",
            }}
            {...props}
        />
    );

    const components: Components = {
        a: LinkRenderer,
        code: CodeRenderer,
        pre: PreRenderer,
        table: TableRenderer,
        th: ThRenderer,
        td: TdRenderer,
    };

    return (
        <TypographyStylesProvider>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={components}
            >
                {content}
            </ReactMarkdown>

            <style>{`
        table tr:nth-of-type(odd) td { background: ${zebra}; }
        table th:last-child, table td:last-child { border-right: none; }
      `}</style>
        </TypographyStylesProvider>
    );
}
