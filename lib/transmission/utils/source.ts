// src/utils/source.ts

/**
 * Source text utility functions
 * For working with original markdown source and positions
 */

import type { Position } from "unist";

/**
 * Extract text from source using position info
 */
export function getSourceText(source: string, position: Position): string {
	const lines = source.split("\n");
	const startLine = position.start.line - 1; // 0-indexed
	const endLine = position.end.line - 1;

	if (startLine === endLine) {
		// Single line
		return lines[startLine].slice(
			position.start.column - 1,
			position.end.column - 1,
		);
	}

	// Multi-line
	const result: string[] = [];

	for (let i = startLine; i <= endLine; i++) {
		if (i === startLine) {
			result.push(lines[i].slice(position.start.column - 1));
		} else if (i === endLine) {
			result.push(lines[i].slice(0, position.end.column - 1));
		} else {
			result.push(lines[i]);
		}
	}

	return result.join("\n");
}

/**
 * Get line from source by line number (1-indexed)
 */
export function getLine(source: string, lineNumber: number): string {
	const lines = source.split("\n");
	return lines[lineNumber - 1] || "";
}

/**
 * Get multiple lines from source
 */
export function getLines(
	source: string,
	startLine: number,
	endLine: number,
): string[] {
	const lines = source.split("\n");
	return lines.slice(startLine - 1, endLine);
}
