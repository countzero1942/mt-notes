import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { rehypeTransmission, remarkTransmission } from "./";
import { defaultTxConfig } from "./config";

const markdownParser = unified()
	.use(remarkParse)
	.use(remarkTransmission, defaultTxConfig)
	.use(remarkMath, {
		singleDollarTextMath: true, // Enable $...$ for inline math (default in v6+)
	})
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeKatex)
	.use(rehypeTransmission, defaultTxConfig)
	.use(rehypeStringify);

export const parseTxMarkdown = async (markdown: string): Promise<string> => {
	const vfile = await markdownParser.process(markdown);
	const html = vfile.toString();
	return html;
};
