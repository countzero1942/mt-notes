// src/types.ts

import type { BlockContent, PhrasingContent } from "mdast";
import type { Node } from "unist";

export interface TxConfig {
	inline: Record<string, InlineTagConfig>;
	heading: Record<string, HeadingTagConfig>;
	block: Record<string, BlockTagConfig>;

	// Global settings
	indentUnit?: string; // Default: '2em'
	classPrefix?: string; // Default: 'tx-'
}

export type OutputStrategy = "markdown" | "html" | "component";

export interface BaseTagConfig {
	strategy: OutputStrategy;

	// For markdown strategy
	mdType?:
		| "strong"
		| "emphasis"
		| "delete"
		| "inlineCode"
		| "blockquote"
		| "heading"
		| "list";

	// For html strategy
	htmlTag?: string;
	className?: string | ((variant?: string) => string);

	// For component strategy (MDX)
	component?: string;

	// ARIA attributes
	ariaRole?: string;
	ariaLabel?: string | ((variant?: string) => string);

	// Variants
	variants?: Record<string, string>;
}

export interface InlineTagConfig extends BaseTagConfig {
	// Inline-specific options
}

export interface HeadingTagConfig extends BaseTagConfig {
	// Heading-specific options
	level?: 1 | 2 | 3 | 4 | 5 | 6; // For markdown heading strategy
}

export interface BlockTagConfig extends BaseTagConfig {
	// Where does heading content go?
	headingTarget?: "ignore" | "placeBefore" | "summary" | "figcaption" | "title";

	// Attribute schema
	attributes?: Record<string, AttributeSchema>;
}

export interface AttributeSchema {
	type: "boolean" | "string" | "number" | "array";
	default?: string | number | boolean | string[];
	required?: boolean;
}

export interface ParsedAttributes {
	[key: string]: boolean | string | number | string[];
}

// Custom MDAST node types
export interface TransmissionInline extends Node {
	type: "transmissionInline";
	tag: string;
	variant?: string;
	children: PhrasingContent[];
	data?: {
		hName?: string;
		hProperties?: Record<string, unknown>;
	};
}

export interface TransmissionBlock extends Node {
	type: "transmissionBlock";
	tag: string;
	variant?: string;
	headingContent?: PhrasingContent[];
	attributes?: ParsedAttributes;
	children: BlockContent[];
	data?: {
		hName?: string;
		hProperties?: Record<string, unknown>;
	};
}

export interface TransmissionFragment extends Node {
	type: "transmissionFragment";
	children: BlockContent[];
}

export interface PoeticLine extends Node {
	type: "poeticLine";
	indent: number;
	children: PhrasingContent[];
	data?: {
		hName: "p";
		hProperties: {
			className: string[];
			style?: string;
		};
	};
}

// Utility types
export interface IndentedLine {
	content: string;
	indent: number;
	isVerticalSpace: boolean;
	lineNumber: number;
}

export interface ParseResult<T> {
	node: T;
	endPos: number;
}

declare module "mdast" {
	interface PhrasingContentMap {
		transmissionInline: TransmissionInline;
	}

	interface BlockContentMap {
		transmissionBlock: TransmissionBlock;
		transmissionFragment: TransmissionFragment;
		poeticLine: PoeticLine;
	}

	interface RootContentMap {
		transmissionBlock: TransmissionBlock;
		transmissionFragment: TransmissionFragment;
		poeticLine: PoeticLine;
	}
}
