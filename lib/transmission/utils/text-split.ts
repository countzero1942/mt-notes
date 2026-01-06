// src/utils/text-split.ts

import type { Text } from "mdast";
import type { Position } from "unist";

/**
 * Result of splitting a text node at dot-tag boundaries
 * Returns only non-empty text nodes
 */
export interface SplitResult {
	before: Text | null; // Text before dot-tag (null if empty)
	content: Text | null; // Text inside dot-tag (null if empty)
	after: Text | null; // Text after dot-tag (null if empty)
}

/**
 * Split a text node at dot-tag boundaries
 * @param textNode - The text node to split
 * @param tagStart - Character offset where dot-tag starts (e.g., position of '.b{')
 * @param tagContentStart - Character offset where content starts (after '{')
 * @param tagContentEnd - Character offset where content ends (before '}')
 * @param tagEnd - Character offset where dot-tag ends (after '}')
 * @param source - Full source text
 * @returns Object with before, content, and after text nodes (null if empty)
 */
export function splitTextAtDotTag(
	textNode: Text,
	tagStart: number,
	tagContentStart: number,
	tagContentEnd: number,
	tagEnd: number,
	source: string,
): SplitResult {
	if (!textNode.position) {
		return { before: null, content: null, after: null };
	}

	const nodeStart = getCharOffset(textNode.position.start, source);
	const nodeEnd = getCharOffset(textNode.position.end, source);

	// Text before tag: from node start to tag start
	const beforeText =
		tagStart > nodeStart ? source.slice(nodeStart, tagStart) : "";

	// Text inside tag content: from content start to content end
	const contentText =
		tagContentEnd > tagContentStart
			? source.slice(tagContentStart, tagContentEnd)
			: "";

	// Text after tag: from tag end to node end
	const afterText = nodeEnd > tagEnd ? source.slice(tagEnd, nodeEnd) : "";

	return {
		before: beforeText
			? createTextNode(beforeText, textNode.position.start, tagStart, source)
			: null,
		content: contentText
			? createTextNode(
					contentText,
					offsetToPoint(tagContentStart, source),
					tagContentEnd,
					source,
				)
			: null,
		after: afterText
			? createTextNode(
					afterText,
					offsetToPoint(tagEnd, source),
					nodeEnd,
					source,
				)
			: null,
	};
}

/**
 * Get character offset from a position point
 */
function getCharOffset(
	point: { line: number; column: number; offset?: number },
	source: string,
): number {
	if (point.offset !== undefined) return point.offset;

	const lines = source.split("\n");
	let offset = 0;
	for (let i = 0; i < point.line - 1; i++) {
		offset += lines[i].length + 1; // +1 for newline
	}
	offset += point.column - 1; // Column is 1-indexed
	return offset;
}

/**
 * Convert character offset to line/column position
 */
function offsetToPoint(
	offset: number,
	source: string,
): { line: number; column: number; offset: number } {
	const lines = source.split("\n");
	let currentOffset = 0;

	for (let i = 0; i < lines.length; i++) {
		const lineEnd = currentOffset + lines[i].length;
		if (offset <= lineEnd) {
			return {
				line: i + 1,
				column: offset - currentOffset + 1,
				offset,
			};
		}
		currentOffset = lineEnd + 1; // +1 for newline
	}

	// Fallback: end of file
	return {
		line: lines.length,
		column: lines[lines.length - 1].length + 1,
		offset,
	};
}

/**
 * Create a text node with proper position
 * Both start and end points are calculated correctly
 */
function createTextNode(
	value: string,
	startPoint: { line: number; column: number; offset?: number },
	endOffset: number,
	source: string,
): Text {
	const startOffset = getCharOffset(startPoint, source);
	const endPoint = offsetToPoint(endOffset, source);

	return {
		type: "text",
		value,
		position: {
			start: {
				line: startPoint.line,
				column: startPoint.column,
				offset: startOffset,
			},
			end: endPoint,
		},
	};
}
