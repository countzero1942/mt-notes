"use client";

import { Button, Grid } from "@mantine/core";
import { useState } from "react";
import { parseTxMarkdown } from "@/server/markdown-parser";
import { CodeBlock } from "./code-block";

export type MarkdownTxSectionProps = {
	title: string;
	markdown: string;
};

export const MarkdownTxSection = ({
	title,
	markdown,
}: MarkdownTxSectionProps) => {
	const [html, setHtml] = useState<string>("");

	async function handleConvert() {
		const htmlString = await parseTxMarkdown(markdown);
		setHtml(htmlString);
	}

	return (
		<section>
			<h2>{title}</h2>
			<Grid>
				<Grid.Col span={6}>
					<CodeBlock codeString={markdown} language="markdown" />
				</Grid.Col>
				<Grid.Col span={6}>
					<CodeBlock codeString={html} language="markup" />
				</Grid.Col>
				<Grid.Col span={12}>
					<Button onClick={handleConvert}>Convert</Button>
				</Grid.Col>
			</Grid>
		</section>
	);
};
