"use server";

import type prettier from "prettier";
import { parseTxMarkdown } from "@/tx";
import { formatHtml } from "./format-string";

export const parseTxMarkdownService = async (
	markdown: string,
	options?: prettier.Options,
): Promise<string> => {
	const html = await parseTxMarkdown(markdown);
	// const formattedHtml = await formatHtml(html, options);
	return html;
};
