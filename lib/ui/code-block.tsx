// import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
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

export const CodeBlock = (props: CodeBlockProps) => {
	return (
		<SyntaxHighlighter language={props.language} style={coldarkDark}>
			{props.codeString}
		</SyntaxHighlighter>
	);
};
