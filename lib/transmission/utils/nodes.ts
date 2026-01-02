// src/utils/nodes.ts

/**
 * MDAST node utility functions
 * For creating and manipulating AST nodes
 */

import type { BlockContent, PhrasingContent, RootContent } from "mdast";

/**
 * Check if a node is empty (no content)
 */
export function isEmptyNode(
	node: PhrasingContent | BlockContent | RootContent,
): boolean {
	if (node.type === "text") {
		return !node.value.trim();
	}

	if ("children" in node) {
		return (
			node.children.length === 0 ||
			node.children.every((child) => isEmptyNode(child))
		);
	}

	return false;
}

/**
 * Extract text content from a node tree
 */
export function extractText(
	node: PhrasingContent | BlockContent | RootContent,
): string {
	if (node.type === "text") {
		return node.value;
	}

	if ("children" in node) {
		return node.children.map((child) => extractText(child)).join("");
	}

	if ("value" in node) {
		return String(node.value);
	}

	return "";
}

/**
 * Count text length in a node tree
 */
export function getTextLength(
	node: PhrasingContent | BlockContent | RootContent,
): number {
	return extractText(node).length;
}

/**
 * Check if node contains only whitespace
 */
export function isWhitespaceOnly(
	node: PhrasingContent | BlockContent | RootContent,
): boolean {
	const text = extractText(node);
	return text.trim().length === 0;
}
