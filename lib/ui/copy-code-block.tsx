import { Box, Button, Paper, rem, Tooltip } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import md from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import { coldarkDark } from "react-syntax-highlighter/dist/esm/styles/prism";

SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("markdown", md);
SyntaxHighlighter.registerLanguage("markup", markup);

export type CodeBlockLanguage = "sql" | "json" | "markdown" | "markup";

export type CodeBlockProps = {
	codeString: string;
	language: CodeBlockLanguage;
};

export function CodeBlockWithCopy(props: CodeBlockProps) {
	const clipboard = useClipboard({ timeout: 500 });

	return (
		<Paper
			shadow="sm"
			radius="md"
			withBorder
			p="md"
			style={{ position: "relative" }}
		>
			{/* <Code block style={{ paddingRight: rem(50) }}>
				{props.codeString}
			</Code> */}
			<SyntaxHighlighter language={props.language} style={coldarkDark}>
				{props.codeString}
			</SyntaxHighlighter>

			<Box style={{ position: "absolute", top: rem(10), right: rem(10) }}>
				<Tooltip
					label={clipboard.copied ? "Copied" : "Copy"}
					withArrow
					position="left"
				>
					<Button
						variant="default"
						size="compact-sm"
						onClick={() => clipboard.copy(props.codeString)}
					>
						{clipboard.copied ? (
							<IconCheck style={{ width: rem(16), height: rem(16) }} />
						) : (
							<IconCopy style={{ width: rem(16), height: rem(16) }} />
						)}
					</Button>
				</Tooltip>
			</Box>
		</Paper>
	);
}
