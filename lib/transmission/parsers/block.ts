// src/parsers/block.ts

import type { BlockContent, List, ListItem, PhrasingContent } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import type {
	BlockComponentConfig,
	BlockHtmlConfig,
	BlockMarkdownConfig,
	BlockTagConfig,
	ComponentSpec,
	IndentedLine,
	ParsedAttributes,
	TransmissionBlock,
	TransmissionFragment,
	TxConfig,
} from "../types";
import { linesToText } from "../utils/indent";
import { parseBlockAttributes, parseInlineAttributes } from "./attributes";
import { parseInlineTransmission } from "./inline";
import { parsePoeticBody } from "./poetic";

/** Exhaustiveness guard: adding a new strategy turns every switchboard red. */
function assertNever(x: never): never {
	throw new Error(`Unhandled transmission config: ${JSON.stringify(x)}`);
}

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
	const tagConfig: BlockTagConfig | undefined = config.block[tag];

	if (!tagConfig) {
		// Unknown tag - create generic block
		return createGenericBlock(tag, variant, headingContent, bodyLines, config);
	}

	// Parse attributes from heading content
	const { attributes, contentWithoutAttrs } = parseInlineAttributes(
		headingContent,
		tagConfig.strategy === "markdown" ? undefined : tagConfig.attributes,
	);

	// Parse block-level attributes from body
	const { attributes: blockAttrs, contentLines } = parseBlockAttributes(
		bodyLines.map((l) => l.content),
		tagConfig.strategy === "markdown" ? undefined : tagConfig.attributes,
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

	// Parse body content. Lists keep markdown body parsing (each top-level block
	// becomes a list item); every other block uses poetic-aware parsing so that
	// single-newline lines are preserved as poetic lines.
	const isListBlock =
		tagConfig.strategy === "markdown" && tagConfig.mdType === "list";
	const bodyNodes = isListBlock
		? parseBodyContent(finalBodyLines, config)
		: parsePoeticBody(finalBodyLines, config);

	switch (tagConfig.strategy) {
		case "markdown":
			return createMarkdownBlock(tag, tagConfig, headingNodes, bodyNodes, config);
		case "html":
			return createHtmlBlock(
				tag,
				variant,
				headingNodes,
				bodyNodes,
				allAttributes,
				tagConfig,
				config,
			);
		case "component":
			return createComponentBlock(
				tag,
				variant,
				headingNodes,
				bodyNodes,
				finalBodyLines,
				allAttributes,
				tagConfig,
				config,
			);
		default:
			return assertNever(tagConfig);
	}
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
 * Create a markdown block (list, blockquote, heading)
 */
function createMarkdownBlock(
	tag: string,
	tagConfig: BlockMarkdownConfig,
	headingNodes: PhrasingContent[],
	bodyNodes: BlockContent[],
	config: TxConfig,
): BlockContent | TransmissionFragment {
	switch (tagConfig.mdType) {
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
			if (tagConfig.headingTarget === "placeBefore" && headingNodes.length > 0) {
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
			// Level is guaranteed present only on the heading member of the union
			return {
				type: "heading",
				depth: tagConfig.level,
				children: headingNodes,
			};
		}

		default:
			return assertNever(tagConfig);
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
	tagConfig: BlockHtmlConfig,
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
			hName: tagConfig.htmlTag,
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
 * Create a component (island) block.
 *
 * NOTE: this emits a server-render placeholder carrying the component spec and
 * its props. The actual SSR + hydration runtime (island manifest, per-framework
 * adapters) plugs in here later; for now the placeholder is the stable seam.
 */
function createComponentBlock(
	tag: string,
	variant: string | undefined,
	headingNodes: PhrasingContent[],
	bodyNodes: BlockContent[],
	bodyLines: IndentedLine[],
	attributes: ParsedAttributes,
	tagConfig: BlockComponentConfig,
	config: TxConfig,
): TransmissionBlock {
	const spec: ComponentSpec = tagConfig.component;

	// Props: %-attributes, plus the raw body mapped onto contentProp if requested.
	const props: ParsedAttributes = { ...attributes };
	if (spec.contentProp) {
		props[spec.contentProp] = bodyLines
			.filter((l) => !l.isVerticalSpace)
			.map((l) => l.content);
	}

	return {
		type: "transmissionBlock",
		tag,
		variant,
		headingContent: headingNodes.length > 0 ? headingNodes : undefined,
		attributes,
		// If the body is consumed as a prop, don't also render it as children.
		children: spec.contentProp ? [] : bodyNodes,
		data: {
			hName: "div",
			hProperties: {
				"data-tx-component": spec.export ?? "default",
				"data-tx-source": spec.source,
				"data-tx-framework": spec.framework ?? "react",
				"data-tx-hydrate": spec.hydrate ?? "load",
				"data-tx-props": JSON.stringify(props),
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

	const bodyNodes = parsePoeticBody(bodyLines, config);

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
