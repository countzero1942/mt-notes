// src/remark-transmission.ts

import type { Node, Paragraph, PhrasingContent, Root, RootContent, Text } from "mdast";
import { SKIP, visit } from "unist-util-visit";
import type { Position } from "unist";
import type { VFile } from "vfile";
import { createTransmissionBlock } from "./parsers/block";
import { scanInlineTreeForDotTags } from "./parsers/inline-scanner";
import { parsePoeticBody } from "./parsers/poetic";
import type { HeadingTagConfig, IndentedLine, TxConfig } from "./types";
import { getIndentedBlock } from "./utils/indent";
import { getSourceText } from "./utils/source";

export function remarkTransmission(txConfig: TxConfig) {
	return function transformer(tree: Root, file: VFile) {
		const source = String(file);
		const lines = source.split("\n");

		// Phase 1: Process block dot-tags
		processBlockDotTags(tree, lines, source, txConfig);

		// Phase 2: Process heading dot-tags (convert paragraph to heading)
		processHeadingDotTags(tree, source, txConfig);

		// Phase 3: Process inline dot-tags in other container nodes
		// (Paragraphs and headings already scanned in Phase 2)
		visit(tree, (node) => {
			// Only scan remaining container nodes
			if (
				node.type === "listItem" ||
				node.type === "blockquote" ||
				node.type === "transmissionBlock"
			) {
				if ("children" in node && Array.isArray(node.children)) {
					scanInlineTreeForDotTags(node, source, txConfig);
				}

				// Also scan headingContent field for transmissionBlock
				if (
					node.type === "transmissionBlock" &&
					"headingContent" in node &&
					Array.isArray(node.headingContent)
				) {
					// Create a temporary container to scan heading content
					const tempContainer = {
						type: "paragraph" as const,
						children: node.headingContent,
					};
					scanInlineTreeForDotTags(tempContainer, source, txConfig);
					// Update the original headingContent
					node.headingContent = tempContainer.children as PhrasingContent[];
				}
			}
		});

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
	source: string,
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
		// Match only the FIRST line: markdown lazy-continuation merges the
		// indented body into this same paragraph/text node, so anchoring to
		// end-of-string ($) would fail for any multi-line block. Same-line
		// content (if any) is captured; an indented body is read from source.
		const match = firstChild.value.match(/^\.(\w+)(?:\.(\w+))?:[ \t]*([^\n]*)/);

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

		// IMMEDIATELY scan the block's heading content and children
		if (txNode.type === "transmissionBlock" && txNode.headingContent) {
			// Create temp container to scan heading
			const tempContainer = {
				type: "paragraph" as const,
				children: txNode.headingContent,
			};
			scanInlineTreeForDotTags(tempContainer, source, config);
			txNode.headingContent = tempContainer.children as PhrasingContent[];
		}
		if ("children" in txNode && Array.isArray(txNode.children)) {
			scanInlineTreeForDotTags(txNode, source, config);
		}
	}
}

/**
 * Process heading dot-tags: .h2 Heading text
 * Also scans ALL paragraphs for inline dot-tags, and detects poetic text in
 * any plain (non-dot-tag) paragraph that spans multiple source lines.
 */
function processHeadingDotTags(tree: Root, source: string, config: TxConfig) {
	visit(tree, "paragraph", (node, index, parent) => {
		if (!parent || index === null || index === undefined) return;

		// Check first child for heading dot-tag
		const firstChild = node.children[0];
		if (firstChild?.type === "text") {
			// Check for heading dot-tag: .h1, .h2, etc. followed by space
			const match = firstChild.value.match(/^\.([\w]+)\s+(.*)$/);

			if (match) {
				const [, tag] = match;

				// Check if it's a configured heading tag
				const tagConfig = config.heading[tag];
				if (tagConfig) {
					// This is a heading - process it
					processHeadingTag(
						node,
						parent,
						index,
						tag,
						match[2],
						tagConfig,
						source,
						config,
					);
					return [SKIP, index];
				}
			}
		}

		// Poetic-text candidate: a paragraph spanning multiple SOURCE lines is
		// single-\n-separated poetic text (a truly blank line would otherwise
		// have ended the paragraph node already, so any paragraph that survived
		// parsing as ONE node with multiple lines is exactly the boundary the
		// poetic spec describes). `node.position` is only present on nodes
		// parsed from the original document source, so this naturally excludes
		// nodes freshly synthesized by other transmission phases (no position).
		// List-item paragraphs are excluded — list bodies keep markdown parsing.
		if (
			node.position &&
			node.position.start.line !== node.position.end.line &&
			parent.type !== "listItem"
		) {
			const rawLines = getParagraphSourceLines(source, node.position);
			const replacement = parsePoeticBody(rawLines, config);
			parent.children.splice(index, 1, ...replacement);
			return [SKIP, index];
		}

		// Not a heading or poetic block - scan paragraph for inline tags immediately
		scanInlineTreeForDotTags(node, source, config);
	});
}

/**
 * Read the raw source lines spanned by a paragraph's position, preserving
 * leading tabs that the parsed text VALUE strips on continuation lines (the
 * same reason block dot-tag bodies read indentation from source rather than
 * from the AST). A truly blank line cannot occur within these lines — that
 * would already have ended the paragraph — so only ":" needs to be flagged
 * as the in-block vertical-space marker.
 */
function getParagraphSourceLines(
	source: string,
	position: Position,
): IndentedLine[] {
	const raw = getSourceText(source, position);
	const startLine = position.start.line;
	return raw.split("\n").map((content, i) => ({
		content,
		indent: 0,
		isVerticalSpace: content.trim() === ":",
		lineNumber: startLine + i,
	}));
}

/**
 * Process a single heading tag
 */
function processHeadingTag(
	node: Paragraph,
	parent: any,
	index: number,
	tag: string,
	remainingText: string,
	tagConfig: HeadingTagConfig,
	source: string,
	config: TxConfig,
) {
	// Remove the tag from the first text node
	if (remainingText) {
		// Update the existing text node with corrected position
		const firstChild = node.children[0] as Text;
		const tagLength = tag.length + 2; // ".tag " = tag + dot + space

		if (firstChild.position) {
			// Calculate new start position (advanced by tag length)
			const oldStart = firstChild.position.start;
			const newStartColumn = oldStart.column + tagLength;
			const newStartOffset = oldStart.offset
				? oldStart.offset + tagLength
				: undefined;

			// Update the text node in place
			firstChild.value = remainingText;
			firstChild.position = {
				start: {
					line: oldStart.line,
					column: newStartColumn,
					offset: newStartOffset,
				},
				end: firstChild.position.end, // Keep same end
			};
		} else {
			// No position data, just update value
			firstChild.value = remainingText;
		}
	} else {
		// Remove the first text node if empty after removing tag
		node.children.shift();
	}

	// Create heading node with all children (markdown already parsed)
	if (tagConfig.strategy === "markdown") {
		const headingNode = {
			type: "heading" as const,
			depth: tagConfig.level,
			children: node.children as PhrasingContent[],
		};

		parent.children[index] = headingNode;

		// IMMEDIATELY scan the heading's children for inline tags
		scanInlineTreeForDotTags(headingNode, source, config);
	} else {
		// HTML strategy
		const blockNode = {
			type: "transmissionBlock" as const,
			tag,
			children: [
				{
					type: "paragraph" as const,
					children: node.children as PhrasingContent[],
				},
			],
			data: {
				hName: tagConfig.htmlTag,
				hProperties: {
					className:
						typeof tagConfig.className === "function"
							? tagConfig.className()
							: tagConfig.className,
				},
			},
		};

		parent.children[index] = blockNode;

		// IMMEDIATELY scan the block's children for inline tags
		scanInlineTreeForDotTags(blockNode, source, config);
	}
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
	children: RootContent[],
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
