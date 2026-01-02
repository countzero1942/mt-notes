// src/utils/indent.ts

import type { IndentedLine } from "../types.js";

/**
 * Get indentation level from a line
 * Counts tabs and converts spaces to tabs (4 spaces = 1 tab)
 */
export function getIndentLevel(line: string): number {
	let indent = 0;
	let spaceCount = 0;

	for (const char of line) {
		if (char === "\t") {
			indent++;
			spaceCount = 0; // Reset space count
		} else if (char === " ") {
			spaceCount++;
			if (spaceCount === 4) {
				indent++;
				spaceCount = 0;
			}
		} else {
			break; // Hit non-whitespace
		}
	}

	return indent;
}

/**
 * Extract indented block content from source lines
 * Returns lines until dedent is detected
 */
export function getIndentedBlock(
	lines: string[],
	startLineIndex: number,
): { indentedLines: IndentedLine[]; endLineIndex: number } {
	const indentedLines: IndentedLine[] = [];
	let currentIndex = startLineIndex;
	let baseIndent: number | null = null;

	while (currentIndex < lines.length) {
		const line = lines[currentIndex];
		const trimmed = line.trim();

		// Empty line or colon-only line (vertical spacing marker)
		if (trimmed === "" || trimmed === ":") {
			indentedLines.push({
				content: "",
				indent: 0,
				isVerticalSpace: true,
				lineNumber: currentIndex + 1,
			});
			currentIndex++;
			continue;
		}

		const indent = getIndentLevel(line);

		// First non-empty line sets base indentation
		if (baseIndent === null) {
			baseIndent = indent;

			if (baseIndent === 0) {
				// No indentation, block ends immediately
				break;
			}
		}

		// Check if we've dedented (end of block)
		if (indent < baseIndent) {
			break;
		}

		// Add this line with relative indentation
		indentedLines.push({
			content: line.slice(getWhitespaceLength(line, baseIndent)),
			indent: indent - baseIndent,
			isVerticalSpace: false,
			lineNumber: currentIndex + 1,
		});

		currentIndex++;
	}

	return {
		indentedLines,
		endLineIndex: currentIndex - 1,
	};
}

/**
 * Get the character length of indentation
 */
function getWhitespaceLength(line: string, indentLevel: number): number {
	let length = 0;
	let currentIndent = 0;
	let spaceCount = 0;

	for (let i = 0; i < line.length && currentIndent < indentLevel; i++) {
		const char = line[i];

		if (char === "\t") {
			currentIndent++;
			spaceCount = 0;
			length++;
		} else if (char === " ") {
			spaceCount++;
			length++;
			if (spaceCount === 4) {
				currentIndent++;
				spaceCount = 0;
			}
		} else {
			break;
		}
	}

	return length;
}

/**
 * Convert indented lines back to markdown/transmission text
 */
export function linesToText(lines: IndentedLine[]): string {
	return lines
		.map((line) => {
			if (line.isVerticalSpace) {
				return "";
			}
			return "\t".repeat(line.indent) + line.content;
		})
		.join("\n");
}
