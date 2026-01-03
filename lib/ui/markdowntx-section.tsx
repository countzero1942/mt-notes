"use client";

import { Box, Button, Grid } from "@mantine/core";
import type prettier from "prettier";
import { useState } from "react";
import { parseTxMarkdownService } from "@/server/markdown-parser";
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
		const options: prettier.Options = { printWidth: 40, tabWidth: 2 };
		const htmlString = await parseTxMarkdownService(markdown, options);
		setHtml(htmlString);
	}

	return (
		<section>
			<h3>{title}</h3>
			<Grid>
				<Grid.Col span={6}>
					<CodeBlock codeString={markdown} language="markdown" />
				</Grid.Col>
				<Grid.Col span={6}>
					<CodeBlock codeString={html} language="markup" />
				</Grid.Col>
				<Grid.Col span={12}>
					<Box
						bd="1px solid red"
						p="md"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is generated from our own markdown parser
						dangerouslySetInnerHTML={{ __html: html }}
					/>
				</Grid.Col>
				<Grid.Col span={12}>
					<Button onClick={handleConvert}>Convert</Button>
				</Grid.Col>
			</Grid>
		</section>
	);
};
