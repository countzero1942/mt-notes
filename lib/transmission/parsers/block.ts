// src/parsers/block.ts

import type { BlockContent, List, ListItem, PhrasingContent } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import type {
	IndentedLine,
	ParsedAttributes,
	TransmissionBlock,
	TransmissionFragment,
	TxConfig,
} from "../types.js";
import { linesToText } from "../utils/indent.js";
import { parseBlockAttributes, parseInlineAttributes } from "./attributes.js";
import { parseInlineTransmission } from "./inline.js";

/**
 * Create a transmission block node from parsed components
 */
export function createTransmissionBlock(
	tag: string,
	variant: string | undefined,
	headingContent: string,
	bodyLines: IndentedLine[],
	config: TxConfig,
): BlockContent | TransmissionFragment {
	const tagConfig = config.block[tag];

	if (!tagConfig) {
		// Unknown tag - create generic block
		return createGenericBlock(tag, variant, headingContent, bodyLines, config);
	}

	// Parse attributes from heading content
	const { attributes, contentWithoutAttrs } = parseInlineAttributes(
		headingContent,
		tagConfig.attributes,
	);

	// Parse block-level attributes from body
	const { attributes: blockAttrs, contentLines } = parseBlockAttributes(
		bodyLines.map((l) => l.content),
		tagConfig.attributes,
	);

	// Merge attributes (block-level takes precedence)
	const allAttributes = { ...attributes, ...blockAttrs };

	// Parse heading content as inline markdown/transmission
	const headingNodes = contentWithoutAttrs
		? parseInlineTransmission(contentWithoutAttrs, config)
		: [];

	// Reconstruct body lines without attribute lines
	const attrLineCount = bodyLines.length - contentLines.length;
	const finalBodyLines: IndentedLine[] = contentLines.map((content, i) => ({
		content,
		indent: bodyLines[attrLineCount + i]?.indent || 0,
		isVerticalSpace: content.trim() === "" || content.trim() === ":",
		lineNumber: bodyLines[attrLineCount + i]?.lineNumber || 0,
	}));

	// Parse body content
	const bodyNodes = parseBodyContent(finalBodyLines, config);

	// Strategy: markdown
	if (tagConfig.strategy === "markdown") {
		return createMarkdownBlock(
			tag,
			tagConfig.mdType!,
			headingNodes,
			bodyNodes,
			tagConfig.headingTarget,
			config,
		);
	}

	// Strategy: html or component
	return createHtmlBlock(
		tag,
		variant,
		headingNodes,
		bodyNodes,
		allAttributes,
		tagConfig,
		config,
	);
}

/**
 * Parse body content lines into block nodes
 */
function parseBodyContent(
	lines: IndentedLine[],
	config: TxConfig,
): BlockContent[] {
	if (lines.length === 0) return [];

	// Convert lines back to text
	const bodyText = linesToText(lines);

	if (!bodyText.trim()) return [];

	// Parse as markdown (which will recursively handle transmission)
	try {
		const tree = fromMarkdown(bodyText);
		return tree.children as BlockContent[];
	} catch {
		// If parsing fails, return as paragraph
		return [
			{
				type: "paragraph",
				children: [{ type: "text", value: bodyText }],
			},
		];
	}
}

/**
 * Create a markdown block (list, blockquote, etc.)
 */
function createMarkdownBlock(
	tag: string,
	mdType: string,
	headingNodes: PhrasingContent[],
	bodyNodes: BlockContent[],
	headingTarget: string | undefined,
	config: TxConfig,
): BlockContent | TransmissionFragment {
	switch (mdType) {
		case "list": {
			const ordered = tag === "ol";

			// Convert body nodes to list items
			const listItems: ListItem[] = bodyNodes.map((node) => ({
				type: "listItem",
				children: [node],
			}));

			const listNode: List = {
				type: "list",
				ordered,
				children: listItems,
			};

			// Handle heading placement
			if (headingTarget === "placeBefore" && headingNodes.length > 0) {
				return {
					type: "transmissionFragment",
					children: [
						{
							type: "paragraph",
							children: headingNodes,
						},
						listNode,
					],
				};
			}

			return listNode;
		}

		case "blockquote": {
			return {
				type: "blockquote",
				children: bodyNodes,
			};
		}

		case "heading": {
			// Extract level from tag (h1, h2, etc.)
			const level = parseInt(tag.slice(1), 10) as 1 | 2 | 3 | 4 | 5 | 6;
			return {
				type: "heading",
				depth: level,
				children: headingNodes,
			};
		}

		default:
			return createGenericBlock(tag, undefined, "", [], config);
	}
}

/**
 * Create an HTML block (details, callout, etc.)
 */
function createHtmlBlock(
	tag: string,
	variant: string | undefined,
	headingNodes: PhrasingContent[],
	bodyNodes: BlockContent[],
	attributes: ParsedAttributes,
	tagConfig: any,
	config: TxConfig,
): TransmissionBlock {
	const className =
		typeof tagConfig.className === "function"
			? tagConfig.className(variant)
			: tagConfig.className;

	const ariaLabel =
		typeof tagConfig.ariaLabel === "function"
			? tagConfig.ariaLabel(variant)
			: tagConfig.ariaLabel;

	return {
		type: "transmissionBlock",
		tag,
		variant,
		headingContent: headingNodes.length > 0 ? headingNodes : undefined,
		attributes,
		children: bodyNodes,
		data: {
			hName: tagConfig.htmlTag || "div",
			hProperties: {
				...(className && { className }),
				...(tagConfig.ariaRole && { role: tagConfig.ariaRole }),
				...(ariaLabel && { "aria-label": ariaLabel }),
				...attributes, // Spread attributes as HTML properties
			},
		},
	};
}

/**
 * Create a generic block for unknown tags
 */
function createGenericBlock(
	tag: string,
	variant: string | undefined,
	headingContent: string,
	bodyLines: IndentedLine[],
	config: TxConfig,
): TransmissionBlock {
	const headingNodes = headingContent
		? parseInlineTransmission(headingContent, config)
		: [];

	const bodyNodes = parseBodyContent(bodyLines, config);

	return {
		type: "transmissionBlock",
		tag,
		variant,
		headingContent: headingNodes.length > 0 ? headingNodes : undefined,
		children: bodyNodes,
		data: {
			hName: "div",
			hProperties: {
				className: `${config.classPrefix || "tx-"}${tag}${variant ? `-${variant}` : ""}`,
			},
		},
	};
}
