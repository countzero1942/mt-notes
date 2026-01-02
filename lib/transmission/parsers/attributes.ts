// src/parsers/attributes.ts

import type { AttributeSchema, ParsedAttributes } from "../types.js";

export interface AttributeParseResult {
	attributes: ParsedAttributes;
	contentWithoutAttrs: string;
}

export interface BlockAttributeParseResult {
	attributes: ParsedAttributes;
	contentLines: string[];
}

/**
 * Parse inline attributes from heading content
 * Example: "Heading %flag %param: value %array: a | b | c"
 */
export function parseInlineAttributes(
	content: string,
	schema?: Record<string, AttributeSchema>,
): AttributeParseResult {
	const attributes: ParsedAttributes = {};
	let remainingContent = content;

	// Match attributes: %name or %name: value
	// Stops at next % or end of string
	const attrRegex = /%(\w+)(?::\s*([^%]+?))?(?=\s*%|\s*$)/g;

	const matchesToRemove: Array<{ start: number; end: number }> = [];

	let match: RegExpExecArray | null = attrRegex.exec(content);
	while (match !== null) {
		const [fullMatch, name, value] = match;

		matchesToRemove.push({
			start: match.index,
			end: match.index + fullMatch.length,
		});

		if (!value || value.trim() === "") {
			// Boolean flag
			attributes[name] = true;
		} else {
			// Parse value based on schema or content
			const trimmedValue = value.trim();

			if (trimmedValue.includes("|")) {
				// Array value
				attributes[name] = trimmedValue
					.split("|")
					.map((v) => v.trim())
					.filter((v) => v.length > 0);
			} else if (schema?.[name]?.type === "number") {
				const num = Number(trimmedValue);
				attributes[name] = isNaN(num) ? trimmedValue : num;
			} else {
				attributes[name] = trimmedValue;
			}
		}

		match = attrRegex.exec(content);
	}

	// Remove attributes from content (in reverse to preserve indices)
	for (let i = matchesToRemove.length - 1; i >= 0; i--) {
		const { start, end } = matchesToRemove[i];
		remainingContent =
			remainingContent.slice(0, start) + remainingContent.slice(end);
	}

	return {
		attributes,
		contentWithoutAttrs: remainingContent.trim(),
	};
}

/**
 * Parse block-level attributes from indented lines
 * Attributes must come first before regular content
 */
export function parseBlockAttributes(
	lines: string[],
	schema?: Record<string, AttributeSchema>,
): BlockAttributeParseResult {
	const attributes: ParsedAttributes = {};
	const contentLines: string[] = [];

	let inArrayValue = false;
	let currentArrayKey: string | null = null;
	let currentArray: string[] = [];
	let stillInAttributes = true;

	for (const line of lines) {
		const trimmed = line.trim();

		// Finish previous array if we hit a non-indented attribute or content
		if (inArrayValue && !line.startsWith("\t\t") && !line.startsWith("    ")) {
			if (currentArrayKey) {
				attributes[currentArrayKey] = currentArray;
			}
			inArrayValue = false;
			currentArrayKey = null;
			currentArray = [];
		}

		// Check if it's an attribute line
		if (stillInAttributes && trimmed.startsWith("%")) {
			const colonIndex = trimmed.indexOf(":");

			if (colonIndex === -1) {
				// Boolean flag: %flag
				const name = trimmed.slice(1);
				attributes[name] = true;
			} else {
				const name = trimmed.slice(1, colonIndex);
				const value = trimmed.slice(colonIndex + 1).trim();

				if (!value) {
					// Multi-line array starts
					inArrayValue = true;
					currentArrayKey = name;
					currentArray = [];
				} else if (value.includes("|")) {
					// Inline array: %param: a | b | c
					attributes[name] = value
						.split("|")
						.map((v) => v.trim())
						.filter((v) => v.length > 0);
				} else if (schema?.[name]?.type === "number") {
					const num = Number(value);
					attributes[name] = isNaN(num) ? value : num;
				} else {
					attributes[name] = value;
				}
			}
		} else if (inArrayValue) {
			// This is an array item (must be double-indented)
			currentArray.push(trimmed);
		} else {
			// Regular content line - we're done with attributes
			stillInAttributes = false;
			contentLines.push(line);
		}
	}

	// Finish last array if any
	if (inArrayValue && currentArrayKey) {
		attributes[currentArrayKey] = currentArray;
	}

	return { attributes, contentLines };
}
