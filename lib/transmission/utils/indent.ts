// src/utils/indent.ts

import type { IndentedLine } from "../types";

/**
 * Get indentation level from a line
 * Tab-only: counts leading TAB characters (leading spaces are not indentation)
 */
export function getIndentLevel(line: string): number {
	// Tab-only: a level is one leading TAB character. Leading spaces (e.g. a
	// 4-space "soft tab") are intentionally NOT counted as indentation — they
	// pass through as literal content. (Space->tab preprocessing can be added
	// later if ever needed.)
	let indent = 0;
	for (const char of line) {
		if (char === "\t") {
			indent++;
		} else {
			break; // Hit non-tab
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
				// Preserve which marker it was: ":" keeps a block going as an
				// in-block vertical space; "" is a true blank (paragraph break).
				content: trimmed,
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
	// Tab-only: strip up to `indentLevel` leading TAB characters.
	let length = 0;
	while (length < line.length && length < indentLevel && line[length] === "\t") {
		length++;
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
