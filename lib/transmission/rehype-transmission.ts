// src/rehype-transmission.ts

import type { Element, ElementContent, Root } from "hast";
import type { Node } from "unist";
import { visit } from "unist-util-visit";
import type { TxConfig } from "./types";

// Custom data type for transmission elements
interface TxElementData {
	txType?: "inline" | "block";
	tag?: string;
	variant?: string;
	headingContent?: ElementContent[];
}

export function rehypeTransmission(txConfig: TxConfig) {
	return function transformer(tree: Root) {
		// Process transmission inline nodes
		visit(tree, (node: Node) => {
			if (node.type === "element") {
				const data = (node as Element).data as TxElementData | undefined;
				if (data?.txType === "inline") {
					transformInlineNode(node as Element, txConfig);
				}
			}
		});

		// Process transmission block nodes
		visit(tree, (node: Node) => {
			if (node.type === "element") {
				const data = (node as Element).data as TxElementData | undefined;
				if (data?.txType === "block") {
					transformBlockNode(node as Element, txConfig);
				}
			}
		});
	};
}

/**
 * Transform inline transmission nodes
 */
function transformInlineNode(node: Element, config: TxConfig) {
	const data = node.data as TxElementData;
	const { tag, variant } = data;
	if (!tag) return;
	const tagConfig = config.inline[tag];

	if (!tagConfig) return;

	// If strategy is HTML, ensure proper attributes
	if (tagConfig.strategy === "html") {
		// Classes already set in remark phase via data.hProperties
		// Just ensure consistency
		ensureClassPrefix(node, config.classPrefix || "tx-");
	}
}

/**
 * Transform block transmission nodes
 */
function transformBlockNode(node: Element, config: TxConfig) {
	const data = node.data as TxElementData;
	const { tag, variant, headingContent } = data;
	if (!tag) return;
	const tagConfig = config.block[tag];

	if (!tagConfig) return;

	// Handle heading target placement
	if (headingContent && tagConfig.headingTarget) {
		switch (tagConfig.headingTarget) {
			case "summary":
				insertSummaryElement(node, headingContent);
				break;
			case "figcaption":
				insertFigcaptionElement(node, headingContent);
				break;
			case "title":
				insertTitleElement(node, headingContent, config);
				break;
		}
	}

	// Ensure class prefix
	ensureClassPrefix(node, config.classPrefix || "tx-");
}

/**
 * Insert <summary> element for <details>
 */
function insertSummaryElement(node: Element, headingContent: ElementContent[]) {
	const summary: Element = {
		type: "element",
		tagName: "summary",
		properties: {},
		children: headingContent,
	};

	// Insert at beginning
	node.children.unshift(summary);
}

/**
 * Insert <figcaption> element for <figure>
 */
function insertFigcaptionElement(
	node: Element,
	headingContent: ElementContent[],
) {
	const figcaption: Element = {
		type: "element",
		tagName: "figcaption",
		properties: {},
		children: headingContent,
	};

	// Insert at beginning (or end, depending on preference)
	node.children.unshift(figcaption);
}

/**
 * Insert title/heading element
 */
function insertTitleElement(
	node: Element,
	headingContent: ElementContent[],
	config: TxConfig,
) {
	const title: Element = {
		type: "element",
		tagName: "div",
		properties: {
			className: [`${config.classPrefix || "tx-"}block-title`],
		},
		children: headingContent,
	};

	node.children.unshift(title);
}

/**
 * Ensure all classes have the correct prefix
 */
function ensureClassPrefix(node: Element, prefix: string) {
	if (!node.properties?.className) return;

	const rawClassName = node.properties.className;
	const classes: (string | number)[] = Array.isArray(rawClassName)
		? rawClassName.filter(
				(c): c is string | number =>
					typeof c === "string" || typeof c === "number",
			)
		: typeof rawClassName === "string" || typeof rawClassName === "number"
			? [rawClassName]
			: [];

	node.properties.className = classes.map((c) => {
		if (typeof c !== "string") return c;

		// Skip if already has prefix or is a standard class
		if (c.startsWith(prefix) || c.startsWith("hljs-")) {
			return c;
		}

		// Add prefix
		return `${prefix}${c}`;
	});
}
