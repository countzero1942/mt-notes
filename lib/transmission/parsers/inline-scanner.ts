// src/parsers/inline-scanner.ts

import type { Parent, PhrasingContent, Text } from "mdast";
import type { TransmissionInline, TxConfig } from "../types";
import { intervalContains, nodeToInterval } from "../utils/position";
import { splitTextAtDotTag } from "../utils/text-split";
import { offsetToPoint } from "../utils/text-split";

/**
 * Recursively scan inline tree for dot-tags
 * Works with parsed MDAST nodes, uses position intervals
 */
export function scanInlineTreeForDotTags(
	parent: Parent,
	source: string,
	config: TxConfig,
): void {
	// Ensure we have children to scan
	if (!Array.isArray(parent.children) || parent.children.length === 0) {
		return;
	}

	const scannableNodes = config.scannableMdNodes || [];

	// Iterate children with careful index tracking
	let i = 0;
	while (i < parent.children.length) {
		const node = parent.children[i] as PhrasingContent;

		if (node.type === "text") {
			// Process this text node for dot-tags
			const result = processTextNodeForDotTags(node, parent, i, source, config);

			if (result.foundDotTag && result.txNode) {
				// Text node was split, tx-inline created
				// Scan down the newly created tx-inline node
				scanInlineTreeForDotTags(result.txNode, source, config);

				// Continue from current position (which might now point to different node)
				continue;
			}
		} else if (scannableNodes.includes(node.type)) {
			// Scannable md-inline (strong, emphasis, delete)
			scanInlineTreeForDotTags(node as Parent, source, config);
		} else if (node.type.startsWith("transmission")) {
			// All tx nodes are scannable
			scanInlineTreeForDotTags(node as Parent, source, config);
		}

		i++;
	}
}

/**
 * Process a single text node for dot-tags
 * Returns info about whether a dot-tag was found and processed
 */
function processTextNodeForDotTags(
	textNode: Text,
	parent: Parent,
	index: number,
	source: string,
	config: TxConfig,
): { foundDotTag: boolean; txNode?: TransmissionInline } {
	// Find first dot-tag in text: .tag{ or .tag.variant{
	const dotTagRegex = /\.(\w+)(?:\.(\w+))?\{/;
	const match = textNode.value.match(dotTagRegex);

	if (!match) {
		return { foundDotTag: false };
	}

	const tag = match[1];
	const variant = match[2];

	// Check if this is a valid inline tag
	const tagConfig = config.inline[tag];
	if (!tagConfig) {
		// Unknown tag, skip it
		return { foundDotTag: false };
	}

	if (!textNode.position) {
		// Text node was modified (e.g., in heading processing), no position
		// Fall back to processing using the text value directly
		return processTextNodeByValue(textNode, parent, index, config);
	}

	// Get character offsets for this text node
	const textInterval = nodeToInterval(textNode.position, source);
	const textStart = textInterval.start;

	// Find where the dot-tag starts in source
	const tagStartInText = match.index!;
	const tagStart = textStart + tagStartInText;
	const tagPrefixLength = match[0].length; // Length of ".tag{" or ".tag.variant{"
	const contentStart = tagStart + tagPrefixLength;

	// Find closing brace using recursive counting
	const closingBracePos = findClosingBrace(source, contentStart);
	if (closingBracePos === -1) {
		// Malformed - no closing brace found
		return { foundDotTag: false };
	}

	const contentEnd = closingBracePos;
	const tagEnd = closingBracePos + 1; // After '}'

	// Now we have the content interval: [contentStart, contentEnd)
	const contentInterval = { start: contentStart, end: contentEnd };

	// Split the text node at dot-tag boundaries
	const split = splitTextAtDotTag(
		textNode,
		tagStart,
		contentStart,
		contentEnd,
		tagEnd,
		source,
	);

	// Find sibling nodes that are inside the content interval
	const nodesToMove: PhrasingContent[] = [];
	const indicesToRemove: number[] = [];
	let endTextNodeIndex: number | null = null;
	let endTextNode: Text | null = null;

	for (let i = index + 1; i < parent.children.length; i++) {
		const sibling = parent.children[i] as PhrasingContent;
		if (!sibling.position) continue;

		const siblingInterval = nodeToInterval(sibling.position, source);

		if (intervalContains(contentInterval, siblingInterval)) {
			// This node is fully inside the dot-tag content
			nodesToMove.push(sibling);
			indicesToRemove.push(i);
		} else if (
			sibling.type === "text" &&
			siblingInterval.start < tagEnd &&
			siblingInterval.end > contentEnd
		) {
			// This text node contains the closing brace
			endTextNodeIndex = i;
			endTextNode = sibling;
			break; // Stop here, this is the last node
		} else if (siblingInterval.start >= contentEnd) {
			// Past the content interval, stop looking
			break;
		}
	}

	// Build children for the tx-inline node
	const txChildren: PhrasingContent[] = [];
	if (split.content) txChildren.push(split.content);
	txChildren.push(...nodesToMove);

	// If closing brace is in a different text node, split it
	let endTextSplit: { endA: Text | null; endB: Text | null } | null = null;
	if (endTextNode && endTextNodeIndex !== null) {
		// Split the end text node at closing brace
		const endNodeInterval = nodeToInterval(endTextNode.position!, source);
		const endNodeStart = endNodeInterval.start;

		// Text before closing brace (end_a): from node start to contentEnd
		const endAText =
			contentEnd > endNodeStart
				? source.slice(endNodeStart, contentEnd)
				: "";

		// Text after closing brace (end_b): from tagEnd to node end
		const endBText =
			endNodeInterval.end > tagEnd
				? source.slice(tagEnd, endNodeInterval.end)
				: "";

		endTextSplit = {
			endA: endAText
				? {
						type: "text",
						value: endAText,
						position: {
							start: endTextNode.position!.start,
							end: offsetToPoint(contentEnd, source),
						},
					}
				: null,
			endB: endBText
				? {
						type: "text",
						value: endBText,
						position: {
							start: offsetToPoint(tagEnd, source),
							end: endTextNode.position!.end,
						},
					}
				: null,
		};

		// Add end_a to tx children
		if (endTextSplit.endA) {
			txChildren.push(endTextSplit.endA);
		}

		// Mark this text node for removal (will be replaced with endB)
		indicesToRemove.push(endTextNodeIndex);
	}

	// Create the tx-inline node
	const txNode = createInlineNode(tag, variant, txChildren, config);

	// Build new children array for parent
	const newChildren: PhrasingContent[] = [];

	// Add nodes before current index
	for (let i = 0; i < index; i++) {
		newChildren.push(parent.children[i] as PhrasingContent);
	}

	// Add split.before if not empty
	if (split.before) {
		newChildren.push(split.before);
	}

	// Add the tx-inline node
	newChildren.push(txNode);

	// Add split.after if not empty
	if (split.after) {
		newChildren.push(split.after);
	}

	// Add endB from split end text node
	if (endTextSplit && endTextSplit.endB) {
		newChildren.push(endTextSplit.endB);
	}

	// Add remaining siblings AFTER the current text node that was split
	// Skip: 1) the text node we just split (at index)
	//       2) any nodes that were moved into txNode (in indicesToRemove)
	const removeSet = new Set(indicesToRemove);
	for (let i = index + 1; i < parent.children.length; i++) {
		if (!removeSet.has(i)) {
			newChildren.push(parent.children[i] as PhrasingContent);
		}
	}

	// Update parent's children
	parent.children = newChildren;

	return { foundDotTag: true, txNode };
}

/**
 * Find closing brace with recursive counting
 */
function findClosingBrace(source: string, startPos: number): number {
	let depth = 1; // We're already inside the opening brace
	let pos = startPos;
	let escaped = false;

	while (pos < source.length && depth > 0) {
		const char = source[pos];

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
				return pos; // Found matching close brace
			}
		}

		pos++;
	}

	return -1; // No matching brace found
}

/**
 * Create an inline transmission node
 */
function createInlineNode(
	tag: string,
	variant: string | undefined,
	children: PhrasingContent[],
	config: TxConfig,
): TransmissionInline {
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

	// Strategy: markdown - create actual MDAST nodes
	if (tagConfig.strategy === "markdown") {
		switch (tagConfig.mdType) {
			case "strong":
				return { type: "strong", children } as any;
			case "emphasis":
				return { type: "emphasis", children } as any;
			case "delete":
				return { type: "delete", children } as any;
			case "inlineCode": {
				// Extract text content for inline code
				const text = children
					.map((c) => (c.type === "text" ? c.value : ""))
					.join("");
				return { type: "inlineCode", value: text } as any;
			}
			default:
				// Unknown md type, create transmission node
				return {
					type: "transmissionInline",
					tag,
					variant,
					children,
				};
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

/**
 * Process a text node that has no position (e.g., was modified)
 * Works purely with text value, not source positions
 */
function processTextNodeByValue(
	textNode: Text,
	parent: Parent,
	index: number,
	config: TxConfig,
): { foundDotTag: boolean; txNode?: TransmissionInline } {
	// Find first dot-tag in text
	const dotTagRegex = /\.(\w+)(?:\.(\w+))?\{/;
	const match = textNode.value.match(dotTagRegex);

	if (!match || match.index === undefined) {
		return { foundDotTag: false };
	}

	const tag = match[1];
	const variant = match[2];
	const tagConfig = config.inline[tag];

	if (!tagConfig) {
		return { foundDotTag: false };
	}

	const tagStartInText = match.index;
	const contentStartInText = tagStartInText + match[0].length;

	// Find closing brace in the text value
	const closingBracePos = findClosingBraceInText(
		textNode.value,
		contentStartInText,
	);
	if (closingBracePos === -1) {
		return { foundDotTag: false };
	}

	// Extract the pieces
	const beforeText = textNode.value.slice(0, tagStartInText);
	const contentText = textNode.value.slice(contentStartInText, closingBracePos);
	const afterText = textNode.value.slice(closingBracePos + 1);

	// Create text nodes (without positions)
	const beforeNode: Text | null = beforeText
		? { type: "text", value: beforeText }
		: null;
	const contentNode: Text | null = contentText
		? { type: "text", value: contentText }
		: null;
	const afterNode: Text | null = afterText
		? { type: "text", value: afterText }
		: null;

	// Build tx node children
	const txChildren: PhrasingContent[] = [];
	if (contentNode) txChildren.push(contentNode);

	// Create tx node
	const txNode = createInlineNode(tag, variant, txChildren, config);

	// Build new children array
	const newChildren: PhrasingContent[] = [];

	// Add nodes before current index
	for (let i = 0; i < index; i++) {
		newChildren.push(parent.children[i] as PhrasingContent);
	}

	if (beforeNode) newChildren.push(beforeNode);
	newChildren.push(txNode);
	if (afterNode) newChildren.push(afterNode);

	// Add remaining siblings
	for (let i = index + 1; i < parent.children.length; i++) {
		newChildren.push(parent.children[i] as PhrasingContent);
	}

	parent.children = newChildren;

	return { foundDotTag: true, txNode };
}

/**
 * Find closing brace in a text string (not source)
 */
function findClosingBraceInText(text: string, startPos: number): number {
	let depth = 1;
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
				return pos;
			}
		}

		pos++;
	}

	return -1;
}
