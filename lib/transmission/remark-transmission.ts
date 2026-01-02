// src/remark-transmission.ts

import type { Paragraph, Root } from "mdast";
import { SKIP, visit } from "unist-util-visit";
import type { VFile } from "vfile";
import { createTransmissionBlock } from "./parsers/block";
import { parseInlineTransmission } from "./parsers/inline";
import type { TxConfig } from "./types";
import { getIndentedBlock } from "./utils/indent";

export function remarkTransmission(txConfig: TxConfig) {
	return function transformer(tree: Root, file: VFile) {
		const source = String(file);
		const lines = source.split("\n");

		// Phase 1: Process block dot-tags
		processBlockDotTags(tree, lines, txConfig);

		// Phase 2: Process heading dot-tags
		processHeadingDotTags(tree, txConfig);

		// Phase 3: Process inline dot-tags
		processInlineDotTags(tree, txConfig);

		// Phase 4: Unwrap fragments
		unwrapFragments(tree);
	};
}

/**
 * Process block dot-tags: .tag: followed by indented content
 */
function processBlockDotTags(
	tree: Root,
	sourceLines: string[],
	config: TxConfig,
) {
	const children = tree.children;

	for (let i = 0; i < children.length; i++) {
		const node = children[i];

		if (node.type !== "paragraph" || !node.position) continue;

		// Get the first text node
		const firstChild = node.children[0];
		if (firstChild?.type !== "text") continue;

		// Check if it matches block dot-tag pattern: .tag: or .tag.variant:
		const match = firstChild.value.match(/^\.(\w+)(?:\.(\w+))?:\s*(.*)$/);

		if (!match) continue;

		const [, tag, variant, headingContent] = match;

		// Get indented block from source
		const startLine = node.position.start.line - 1; // Convert to 0-indexed
		const { indentedLines, endLineIndex } = getIndentedBlock(
			sourceLines,
			startLine + 1, // Next line after dot-tag
		);

		// Create transmission block
		const txNode = createTransmissionBlock(
			tag,
			variant,
			headingContent,
			indentedLines,
			config,
		);

		// Calculate how many nodes to replace
		// (Need to remove nodes that were part of the indented block)
		const nodesToReplace = calculateNodesToReplace(
			children,
			i,
			node.position.end.line,
			endLineIndex + 1, // Convert back to 1-indexed
		);

		children.splice(i, nodesToReplace, txNode);
	}
}

/**
 * Process heading dot-tags: .h2 Heading text
 */
function processHeadingDotTags(tree: Root, config: TxConfig) {
	visit(tree, "paragraph", (node, index, parent) => {
		if (!parent || index === null || index === undefined) return;

		const firstChild = node.children[0];
		if (firstChild?.type !== "text") return;

		// Check for heading dot-tag: .h1, .h2, etc.
		const match = firstChild.value.match(/^\.(\w+)\s+(.+)$/);

		if (!match) return;

		const [, tag, headingText] = match;

		// Check if it's a configured heading tag
		const tagConfig = config.heading[tag];
		if (!tagConfig) return;

		// Parse heading content
		const headingNodes = parseInlineTransmission(headingText, config);

		// Create heading node
		if (tagConfig.strategy === "markdown" && tagConfig.mdType === "heading") {
			const level =
				tagConfig.level ||
				(parseInt(tag.slice(1), 10) as 1 | 2 | 3 | 4 | 5 | 6);

			parent.children[index] = {
				type: "heading",
				depth: level,
				children: headingNodes,
			};
		} else {
			// HTML or component strategy
			parent.children[index] = {
				type: "transmissionBlock",
				tag,
				children: [
					{
						type: "paragraph",
						children: headingNodes,
					},
				],
				data: {
					hName: tagConfig.htmlTag || `h${tagConfig.level || 2}`,
					hProperties: {
						className:
							typeof tagConfig.className === "function"
								? tagConfig.className()
								: tagConfig.className,
					},
				},
			};
		}

		return [SKIP, index];
	});
}

/**
 * Process inline dot-tags in all text nodes
 */
function processInlineDotTags(tree: Root, config: TxConfig) {
	visit(tree, (node, index, parent) => {
		// Process any node that can contain phrasing content
		if ("children" in node && Array.isArray(node.children)) {
			for (let i = 0; i < node.children.length; i++) {
				const child = node.children[i];

				if (child.type === "text") {
					const parsed = parseInlineTransmission(child.value, config);

					// Only replace if we actually found transmission syntax
					if (parsed.length > 1 || (parsed[0] && parsed[0].type !== "text")) {
						node.children.splice(i, 1, ...parsed);
						// Adjust index for newly inserted nodes
						i += parsed.length - 1;
					}
				}
			}
		}
	});
}

/**
 * Unwrap fragment nodes (multi-node insertions)
 */
function unwrapFragments(tree: Root) {
	visit(tree, "transmissionFragment", (node, index, parent) => {
		if (parent && index !== null && index !== undefined && "children" in node) {
			parent.children.splice(index, 1, ...node.children);
			return [SKIP, index];
		}
	});
}

/**
 * Calculate how many MDAST nodes were consumed by an indented block
 */
function calculateNodesToReplace(
	children: any[],
	startIndex: number,
	dotTagEndLine: number,
	blockEndLine: number,
): number {
	let count = 1; // At minimum, the dot-tag line itself

	// Check if any following nodes are within the block
	for (let i = startIndex + 1; i < children.length; i++) {
		const node = children[i];

		if (!node.position) break;

		// If this node starts after the block ends, we're done
		if (node.position.start.line > blockEndLine) {
			break;
		}

		count++;
	}

	return count;
}
