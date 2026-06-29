// src/parsers/inline-scanner.ts

import type { Parent, PhrasingContent, RootContent, Text } from "mdast";
import type { TxConfig } from "../types";
import { intervalContains, nodeToInterval } from "../utils/position";
import {
	offsetToPoint,
	splitTextAtDotTag,
	unescapeDotTagContent,
} from "../utils/text-split";
import { createInlineNode } from "./inline";

/** Narrow a node to one that carries a children array (a unist Parent). */
function isParent(node: RootContent): node is RootContent & Parent {
	return "children" in node && Array.isArray((node as { children?: unknown }).children);
}

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
		const node = parent.children[i];

		if (node.type === "text") {
			// Process this text node for dot-tags
			const result = processTextNodeForDotTags(node, parent, i, source, config);

			if (result.foundDotTag) {
				// A dot-tag was consumed and the children rebuilt. Scan into the
				// newly created node when it has children (skip leaf nodes like
				// inlineCode, and the empty-tag case where no node was created),
				// then re-evaluate from the current index.
				if (result.txNode && isParent(result.txNode)) {
					scanInlineTreeForDotTags(result.txNode, source, config);
				}
				continue;
			}
		} else if (
			scannableNodes.includes(node.type) ||
			node.type.startsWith("transmission")
		) {
			// Scannable md-inline (strong, emphasis, delete) or any tx node
			if (isParent(node)) {
				scanInlineTreeForDotTags(node, source, config);
			}
		}

		i++;
	}
}

/**
 * Process a single text node for dot-tags.
 *
 * Scans for the FIRST closable inline dot-tag. Unknown tags and tags with no
 * matching closing brace are left as literal text and skipped, so a malformed
 * outer tag (e.g. `.b{` with no close) does not hide a valid inner one.
 */
function processTextNodeForDotTags(
	textNode: Text,
	parent: Parent,
	index: number,
	source: string,
	config: TxConfig,
): { foundDotTag: boolean; txNode?: PhrasingContent } {
	if (!textNode.position) {
		// Text node was modified (e.g., in heading processing), no position.
		// Fall back to processing using the text value directly.
		return processTextNodeByValue(textNode, parent, index, config);
	}

	const textInterval = nodeToInterval(textNode.position, source);
	const textStart = textInterval.start;

	const dotTagRegex = /\.(\w+)(?:\.(\w+))?\{/g;
	let match: RegExpExecArray | null = dotTagRegex.exec(textNode.value);
	while (match !== null) {
		const tag = match[1];
		const variant = match[2];

		// Only known inline tags are candidates
		const tagConfig = config.inline[tag];
		if (tagConfig) {
			const tagStart = textStart + match.index;
			const contentStart = tagStart + match[0].length;
			const closingBracePos = findClosingBrace(source, contentStart);

			if (closingBracePos !== -1) {
				return buildInlineFromMatch(
					textNode,
					parent,
					index,
					source,
					config,
					tag,
					variant,
					tagStart,
					contentStart,
					closingBracePos, // contentEnd
					closingBracePos + 1, // tagEnd (after '}')
				);
			}
			// Unclosed: leave it literal and keep scanning for a later tag.
		}

		match = dotTagRegex.exec(textNode.value);
	}

	return { foundDotTag: false };
}

/**
 * Build the tx-inline node for a matched, closable dot-tag and splice it into
 * the parent's children.
 */
function buildInlineFromMatch(
	textNode: Text,
	parent: Parent,
	index: number,
	source: string,
	config: TxConfig,
	tag: string,
	variant: string | undefined,
	tagStart: number,
	contentStart: number,
	contentEnd: number,
	tagEnd: number,
): { foundDotTag: boolean; txNode?: PhrasingContent } {
	// The content interval: [contentStart, contentEnd)
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
	const nodesToMove: RootContent[] = [];
	const indicesToRemove: number[] = [];
	let endTextNodeIndex: number | null = null;
	let endTextNode: Text | null = null;

	for (let i = index + 1; i < parent.children.length; i++) {
		const sibling = parent.children[i];
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

	// Build children for the tx-inline node.
	//
	// The `as PhrasingContent[]` below is sound on two independent grounds:
	//  1. processTextNodeForDotTags only runs when the scanner finds a direct
	//     `text` child, which only exists in phrasing parents (paragraph,
	//     heading, strong, emphasis, transmissionInline). Block containers
	//     (blockquote, listItem, transmissionBlock) hold paragraphs, never bare
	//     text, so every sibling collected here is phrasing content.
	//  2. Block/heading dot-tags are recognized only at line start, and inline
	//     dot-tags only inside `{...}` (and only when defined in config.inline),
	//     so no block/heading node can ever be parsed into the inline tree.
	//     Malformed/unrecognized dot-tags pass through untouched as plain text.
	const txChildren: PhrasingContent[] = [];
	if (split.content) txChildren.push(split.content);
	txChildren.push(...(nodesToMove as PhrasingContent[]));

	// If closing brace is in a different text node, split it
	let endTextSplit: { endA: Text | null; endB: Text | null } | null = null;
	const endPos = endTextNode?.position;
	if (endTextNode && endTextNodeIndex !== null && endPos) {
		// Split the end text node at closing brace
		const endNodeInterval = nodeToInterval(endPos, source);
		const endNodeStart = endNodeInterval.start;

		// Text before closing brace (end_a): from node start to contentEnd
		const endAText =
			contentEnd > endNodeStart
				? unescapeDotTagContent(source.slice(endNodeStart, contentEnd))
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
							start: endPos.start,
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
							end: endPos.end,
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

	// An empty tag (e.g. `.b{}`) has no content and collapses to nothing.
	const txNode =
		txChildren.length > 0
			? createInlineNode(tag, variant, txChildren, config)
			: null;

	// Build new children array for parent
	const newChildren: RootContent[] = [];

	// Add nodes before current index
	for (let i = 0; i < index; i++) {
		newChildren.push(parent.children[i]);
	}

	// Add split.before if not empty
	if (split.before) {
		newChildren.push(split.before);
	}

	// Add the tx-inline node (omitted entirely when the tag was empty)
	if (txNode) {
		newChildren.push(txNode);
	}

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
			newChildren.push(parent.children[i]);
		}
	}

	// Update parent's children
	parent.children = newChildren;

	return txNode ? { foundDotTag: true, txNode } : { foundDotTag: true };
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
 * Process a text node that has no position (e.g., was modified)
 * Works purely with text value, not source positions
 */
function processTextNodeByValue(
	textNode: Text,
	parent: Parent,
	index: number,
	config: TxConfig,
): { foundDotTag: boolean; txNode?: PhrasingContent } {
	const dotTagRegex = /\.(\w+)(?:\.(\w+))?\{/g;
	let match: RegExpExecArray | null = dotTagRegex.exec(textNode.value);
	while (match !== null) {
		const tag = match[1];
		const variant = match[2];
		const tagConfig = config.inline[tag];

		if (tagConfig) {
			const tagStartInText = match.index;
			const contentStartInText = tagStartInText + match[0].length;
			const closingBracePos = findClosingBraceInText(
				textNode.value,
				contentStartInText,
			);

			if (closingBracePos !== -1) {
				// Extract the pieces
				const beforeText = textNode.value.slice(0, tagStartInText);
				const contentText = unescapeDotTagContent(
					textNode.value.slice(contentStartInText, closingBracePos),
				);
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

				// Build tx node children; an empty tag collapses to nothing
				const txChildren: PhrasingContent[] = [];
				if (contentNode) txChildren.push(contentNode);
				const txNode =
					txChildren.length > 0
						? createInlineNode(tag, variant, txChildren, config)
						: null;

				// Build new children array
				const newChildren: RootContent[] = [];
				for (let i = 0; i < index; i++) {
					newChildren.push(parent.children[i]);
				}
				if (beforeNode) newChildren.push(beforeNode);
				if (txNode) newChildren.push(txNode);
				if (afterNode) newChildren.push(afterNode);
				for (let i = index + 1; i < parent.children.length; i++) {
					newChildren.push(parent.children[i]);
				}
				parent.children = newChildren;

				return txNode ? { foundDotTag: true, txNode } : { foundDotTag: true };
			}
			// Unclosed: leave literal and keep scanning.
		}

		match = dotTagRegex.exec(textNode.value);
	}

	return { foundDotTag: false };
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
