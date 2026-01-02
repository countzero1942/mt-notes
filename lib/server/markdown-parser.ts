"use server";

import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import {
	defaultTxConfig,
	mergeTxConfig,
	rehypeTransmission,
	remarkTransmission,
	type TxConfig,
} from "@/tx";

// const processor = unified()
//   .use(remarkParse)
//   .use(remarkTransmission, customConfig)
//   .use(remarkRehype, { allowDangerousHtml: true })
//   .use(rehypeTransmission, customConfig)
//   .use(rehypeStringify);

const markdownParser = unified()
	.use(remarkParse)
	.use(remarkTransmission, defaultTxConfig)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeTransmission, defaultTxConfig)
	.use(rehypeStringify);

export const parseTxMarkdown = async (markdown: string): Promise<string> => {
	return (await markdownParser.process(markdown)).toString();
};
