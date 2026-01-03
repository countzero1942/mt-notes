import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { defaultTxConfig, rehypeTransmission, remarkTransmission } from "@/tx";

const markdownParser = unified()
	.use(remarkParse)
	.use(remarkTransmission, defaultTxConfig)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeTransmission, defaultTxConfig)
	.use(rehypeStringify);

export const parseTxMarkdown = async (markdown: string): Promise<string> => {
	const vfile = await markdownParser.process(markdown);
	const html = vfile.toString();
	return html;
};
