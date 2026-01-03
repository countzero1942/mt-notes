"use server";

import type prettier from "prettier";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { parseTxMarkdown } from "@/local-utils/tx-md-parser";
import {
	defaultTxConfig,
	mergeTxConfig,
	rehypeTransmission,
	remarkTransmission,
	type TxConfig,
} from "@/tx";
import { formatHtml } from "./format-string";

// const processor = unified()
//   .use(remarkParse)
//   .use(remarkTransmission, customConfig)
//   .use(remarkRehype, { allowDangerousHtml: true })
//   .use(rehypeTransmission, customConfig)
//   .use(rehypeStringify);

// const markdownParser = unified()
// 	.use(remarkParse)
// 	.use(remarkTransmission, defaultTxConfig)
// 	.use(remarkRehype, { allowDangerousHtml: true })
// 	.use(rehypeTransmission, defaultTxConfig)
// 	.use(rehypeStringify);

export const parseTxMarkdownService = async (
	markdown: string,
	options?: prettier.Options,
): Promise<string> => {
	// const vfile = await markdownParser.process(markdown);
	const html = await parseTxMarkdown(markdown);
	const formattedHtml = await formatHtml(html, options);
	return formattedHtml;
};
