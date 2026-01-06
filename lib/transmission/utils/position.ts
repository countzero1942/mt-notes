// src/utils/position.ts

import type { Position } from "unist";

/**
 * Text interval using character offsets in source
 */
export interface TextInterval {
	start: number; // Character offset in source
	end: number; // Character offset in source
}

/**
 * Convert MDAST position to character offsets
 * Position is 1-indexed lines and columns, we convert to 0-indexed character offsets
 */
export function nodeToInterval(
	position: Position,
	source: string,
): TextInterval {
	// Use offset directly if available (more reliable)
	if (
		position.start.offset !== undefined &&
		position.end.offset !== undefined
	) {
		return {
			start: position.start.offset,
			end: position.end.offset,
		};
	}

	// Fallback: calculate from line/column
	const lines = source.split("\n");

	// Calculate start offset
	let startOffset = 0;
	for (let i = 0; i < position.start.line - 1; i++) {
		startOffset += lines[i].length + 1; // +1 for newline
	}
	startOffset += position.start.column - 1; // Column is 1-indexed

	// Calculate end offset
	let endOffset = 0;
	for (let i = 0; i < position.end.line - 1; i++) {
		endOffset += lines[i].length + 1; // +1 for newline
	}
	endOffset += position.end.column - 1; // Column is 1-indexed

	return { start: startOffset, end: endOffset };
}

/**
 * Check if two intervals overlap
 */
export function intervalsOverlap(a: TextInterval, b: TextInterval): boolean {
	return a.start < b.end && b.start < a.end;
}

/**
 * Check if outer interval fully contains inner interval
 */
export function intervalContains(
	outer: TextInterval,
	inner: TextInterval,
): boolean {
	return outer.start <= inner.start && inner.end <= outer.end;
}

/**
 * Check if interval is fully inside outer (strictly - not equal)
 */
export function intervalInside(
	outer: TextInterval,
	inner: TextInterval,
): boolean {
	return outer.start < inner.start && inner.end < outer.end;
}
