// src/parsers/inline.ts

import type { PhrasingContent } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import type { ParseResult, TransmissionInline, TxConfig } from "../types";

/**
 * Parse inline transmission syntax recursively
 * Example: ".hl.g{nested .b{text} here}"
 */
export function parseInlineTransmission(
	text: string,
	config: TxConfig,
): PhrasingContent[] {
	const nodes: PhrasingContent[] = [];
	let currentPos = 0;

	// Regex to find dot-tags: .tag or .tag.variant followed by {
	const dotTagRegex = /\.(\w+)(?:\.(\w+))?\{/g;

	while (currentPos < text.length) {
		dotTagRegex.lastIndex = currentPos;
		const match = dotTagRegex.exec(text);

		if (!match) {
			// No more dot-tags, add remaining text
			const remaining = text.slice(currentPos);
			if (remaining) {
				nodes.push(...parseMarkdownInline(remaining));
			}
			break;
		}

		const matchStart = match.index;
		const tag = match[1];
		const variant = match[2];

		// Add any text before this dot-tag
		if (matchStart > currentPos) {
			const beforeText = text.slice(currentPos, matchStart);
			nodes.push(...parseMarkdownInline(beforeText));
		}

		// Find the matching closing brace
		const contentStart = match.index + match[0].length;
		const braceResult = extractBracedContent(text, contentStart);

		if (braceResult.endPos === -1) {
			// Malformed - treat as literal text
			nodes.push({
				type: "text",
				value: match[0],
			});
			currentPos = contentStart;
			continue;
		}

		// Recursively parse the content inside braces
		const childNodes = parseInlineTransmission(braceResult.content, config);

		// Create the transmission node
		const txNode = createInlineNode(tag, variant, childNodes, config);
		nodes.push(txNode);

		currentPos = braceResult.endPos + 1; // +1 for the closing }
	}

	return nodes;
}

/**
 * Extract content between matching braces, handling nesting
 */
export function extractBracedContent(
	text: string,
	startPos: number,
): { content: string; endPos: number } {
	let depth = 1; // We're already inside the opening brace
	let pos = startPos;
	let escaped = false;

	while (pos < text.length && depth > 0) {
		const char = text[pos];

		if (escaped) {
			escaped = false;
			pos++;
			continue;
		}

		if (char === "\\") {
			escaped = true;
			pos++;
			continue;
		}

		if (char === "{") {
			depth++;
		} else if (char === "}") {
			depth--;
			if (depth === 0) {
				// Found matching close brace
				return {
					content: text.slice(startPos, pos),
					endPos: pos,
				};
			}
		}

		pos++;
	}

	// No matching brace found
	return { content: "", endPos: -1 };
}

/**
 * Parse markdown syntax within text
 * PRESERVES exact whitespace by checking if text is plain (no markdown)
 */
function parseMarkdownInline(text: string): PhrasingContent[] {
	if (!text) return [];

	// Check if text contains markdown syntax
	const hasMarkdown = /[*_`~\[]/.test(text);

	if (!hasMarkdown) {
		// Plain text - preserve exact whitespace
		return [{ type: "text", value: text }];
	}

	try {
		// Has markdown - parse it
		const tree = fromMarkdown(text);

		if (tree.children[0]?.type === "paragraph") {
			return tree.children[0].children as PhrasingContent[];
		}

		return [{ type: "text", value: text }];
	} catch {
		// If parsing fails, return as text
		return [{ type: "text", value: text }];
	}
}

/**
 * Create an inline transmission node
 */
function createInlineNode(
	tag: string,
	variant: string | undefined,
	children: PhrasingContent[],
	config: TxConfig,
): TransmissionInline | PhrasingContent {
	const tagConfig = config.inline[tag];

	if (!tagConfig) {
		// Unknown tag, wrap in span with class
		return {
			type: "transmissionInline",
			tag,
			variant,
			children,
			data: {
				hName: "span",
				hProperties: {
					className: `${config.classPrefix || "tx-"}${tag}${variant ? `-${variant}` : ""}`,
				},
			},
		};
	}

	// Strategy: markdown - convert to standard markdown node
	if (tagConfig.strategy === "markdown") {
		switch (tagConfig.mdType) {
			case "strong":
				return { type: "strong", children };
			case "emphasis":
				return { type: "emphasis", children };
			case "delete":
				return { type: "delete", children };
			case "inlineCode": {
				// Extract text content
				const text = children
					.map((c) => (c.type === "text" ? c.value : ""))
					.join("");
				return { type: "inlineCode", value: text };
			}
			default:
				return { type: "transmissionInline", tag, variant, children };
		}
	}

	// Strategy: html or component - create custom node with data
	const className =
		typeof tagConfig.className === "function"
			? tagConfig.className(variant)
			: tagConfig.className;

	return {
		type: "transmissionInline",
		tag,
		variant,
		children,
		data: {
			hName: tagConfig.htmlTag || "span",
			hProperties: {
				...(className && { className }),
				...(tagConfig.ariaRole && { role: tagConfig.ariaRole }),
			},
		},
	};
}
