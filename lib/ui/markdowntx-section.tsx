"use client";

import { Box, Grid } from "@mantine/core";
import type prettier from "prettier";
import { useEffect, useState } from "react";
import { parseTxMarkdownService } from "@/server/markdown-parser";
// import { CodeBlock } from "./code-block";
import { CodeBlockWithCopy } from "./copy-code-block";

export type MarkdownTxSectionProps = {
	title: string;
	markdown: string;
};

export const MarkdownTxSection = ({
	title,
	markdown,
}: MarkdownTxSectionProps) => {
	const [html, setHtml] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function handleConvert() {
			setIsLoading(true);
			setError(null);
			try {
				const options: prettier.Options = {
					printWidth: 40,
					tabWidth: 2,
				};
				const htmlString = await parseTxMarkdownService(markdown, options);
				setHtml(htmlString);
			} catch (err) {
				setError(`Error converting markdown to HTML: ${err}`);
			} finally {
				setIsLoading(false);
			}
		}

		handleConvert();
	}, [markdown]);

	if (isLoading) return <div>Loading...</div>;
	if (error) return <div>Error: {error}</div>;

	return (
		<section>
			<h3>{title}</h3>
			<Grid>
				<Grid.Col span={6}>
					<CodeBlockWithCopy codeString={markdown} language="markdown" />
				</Grid.Col>
				<Grid.Col span={6}>
					<CodeBlockWithCopy codeString={html} language="markup" />
				</Grid.Col>
				<Grid.Col span={12}>
					<Box
						bd="1px solid red"
						p="md"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is generated from our own markdown parser
						dangerouslySetInnerHTML={{ __html: html }}
					/>
				</Grid.Col>
				<Grid.Col span={12}></Grid.Col>
			</Grid>
		</section>
	);
};
