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

/** Helper to flatten React children to text */
function toText(node: React.ReactNode): string {
    if (node == null || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(toText).join("");
    if (React.isValidElement(node)) return toText(node.props.children);
    return "";
}

export default function Markdown({ content }: { content: string }) {
    const theme = useMantineTheme();
    const { colorScheme } = useMantineColorScheme();

    const border = colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3];
    const zebra = colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.gray[0];

    // --- Custom renderers ---

    // Inline code (react-markdown v9 only uses this for inline)
    const CodeRenderer: Components["code"] = ({ children, ...props }) => (
        <MantineCode {...props}>{children}</MantineCode>
    );

    // Fenced code blocks (<pre><code>...</code></pre>)
    const PreRenderer: Components["pre"] = ({ children, ...props }) => {
        const childArray = React.Children.toArray(children);
        const first = childArray[0] as React.ReactNode;

        // get className from inner <code> for syntax highlighting
        let className = "";
        if (React.isValidElement(first) && typeof first.props.className === "string") {
            className = first.props.className;
        }

        // flatten to text & trim final newline
        const raw = toText(first);
        const trimmed = raw.replace(/\n$/, "");

        return (
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
                    <code className={className}>{trimmed}</code>
                </pre>
            </ScrollArea.Autosize>
        );
    };

    // Links
    const LinkRenderer: Components["a"] = ({ href, title, children }) => (
        <MantineAnchor href={href ?? "#"} title={title ?? undefined} target="_blank" rel="noreferrer">
            {children}
        </MantineAnchor>
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
        code: CodeRenderer, // inline code
        pre: PreRenderer,   // fenced code
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
