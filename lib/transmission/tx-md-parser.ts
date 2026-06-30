import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { rehypeTransmission, remarkTransmission } from "./";
import { defaultTxConfig, mergeTxConfig } from "./config";
import type { TxConfig } from "./types";

function buildParser(config: TxConfig) {
	return unified()
		.use(remarkParse)
		.use(remarkTransmission, config)
		.use(remarkMath, {
			singleDollarTextMath: true, // Enable $...$ for inline math (default in v6+)
		})
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeKatex)
		.use(rehypeTransmission, config)
		.use(rehypeStringify);
}

// Prebuilt parser for the common (default-config) path.
const defaultParser = buildParser(defaultTxConfig);

export const parseTxMarkdown = async (
	markdown: string,
	userConfig?: Partial<TxConfig>,
): Promise<string> => {
	const parser = userConfig
		? buildParser(mergeTxConfig(userConfig))
		: defaultParser;
	const vfile = await parser.process(markdown);
	const html = vfile.toString();
	return html;
};
