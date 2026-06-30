// src/types.ts

import type { BlockContent, PhrasingContent } from "mdast";
import type { Properties } from "hast";
import type { Node } from "unist";

export interface TxConfig {
	inline: Record<string, InlineTagConfig>;
	heading: Record<string, HeadingTagConfig>;
	block: Record<string, BlockTagConfig>;

	// Global settings
	indentUnit?: string; // Default: '2em'
	classPrefix?: string; // Default: 'tx-'

	// Markdown node types to scan for dot-tags
	// e.g., ['strong', 'emphasis', 'delete']
	scannableMdNodes?: string[];

	// How poetic line blocks (single-newline-separated lines) are rendered.
	// "CssClassLines": each line is its own <p class="tx-line"> (indent via
	//   --tx-indent CSS var from a tx-indent-N class).
	// "LineBreaks": the whole block is one <p> with <br/> between lines, each
	//   indent rendered as `indentString` repeated per level.
	// Default: "CssClassLines".
	poeticTextMode?: PoeticTextMode;

	// Indent string used in "LineBreaks" mode, repeated once per indent level.
	// Default: four non-breaking spaces.
	indentString?: string;
}

export type PoeticTextMode = "CssClassLines" | "LineBreaks";

export type OutputStrategy = "markdown" | "html" | "component";

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

export type ClassName = string | ((variant?: string) => string);
export type AriaLabel = string | ((variant?: string) => string);

export type HeadingTarget =
	| "ignore"
	| "placeBefore"
	| "summary"
	| "figcaption"
	| "title";

// Presentation extras, only mixed into members that render real markup.
interface VariantConfig {
	variants?: Record<string, string>;
}

interface AriaConfig {
	ariaRole?: string;
	ariaLabel?: AriaLabel;
}

// ---------------------------------------------------------------------------
// Component (island) spec — block-only
// ---------------------------------------------------------------------------

export type Framework = "react" | "vue" | "svelte" | "solid";

// Island hydration directive. "none" = server-render only, no client JS.
export type HydrateMode = "load" | "idle" | "visible" | "none";

export interface ComponentSpec {
	source: string; // import specifier, e.g. "@/components/DesmosGraph"
	export?: string; // named export; defaults to "default"
	framework?: Framework; // defaults to "react"
	hydrate?: HydrateMode; // when to hydrate; defaults to "load"
	contentProp?: string; // indented body maps to this prop, e.g. "expressions"
}

// ---------------------------------------------------------------------------
// Inline tags (no component strategy — inline islands are intentionally unsupported)
// ---------------------------------------------------------------------------

export interface InlineMarkdownConfig {
	strategy: "markdown";
	mdType: "strong" | "emphasis" | "delete" | "inlineCode";
}

export interface InlineHtmlConfig extends VariantConfig, AriaConfig {
	strategy: "html";
	htmlTag: string;
	className?: ClassName;
}

export type InlineTagConfig = InlineMarkdownConfig | InlineHtmlConfig;

// ---------------------------------------------------------------------------
// Heading tags (no component strategy)
// ---------------------------------------------------------------------------

export interface HeadingMarkdownConfig {
	strategy: "markdown";
	level: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface HeadingHtmlConfig extends VariantConfig, AriaConfig {
	strategy: "html";
	htmlTag: string;
	className?: ClassName;
}

export type HeadingTagConfig = HeadingMarkdownConfig | HeadingHtmlConfig;

// ---------------------------------------------------------------------------
// Block tags (markdown | html | component)
// ---------------------------------------------------------------------------

// Nested discriminant: only the heading member carries `level`.
export type BlockMarkdownConfig =
	| {
			strategy: "markdown";
			mdType: "blockquote";
			headingTarget?: HeadingTarget;
	  }
	| {
			strategy: "markdown";
			mdType: "list";
			headingTarget?: HeadingTarget;
	  }
	| {
			strategy: "markdown";
			mdType: "heading";
			level: 1 | 2 | 3 | 4 | 5 | 6;
			headingTarget?: HeadingTarget;
	  };

export interface BlockHtmlConfig extends VariantConfig, AriaConfig {
	strategy: "html";
	htmlTag: string;
	className?: ClassName;
	headingTarget?: HeadingTarget;
	attributes?: Record<string, AttributeSchema>;
}

export interface BlockComponentConfig extends VariantConfig {
	strategy: "component";
	component: ComponentSpec;
	headingTarget?: HeadingTarget;
	attributes?: Record<string, AttributeSchema>;
}

export type BlockTagConfig =
	| BlockMarkdownConfig
	| BlockHtmlConfig
	| BlockComponentConfig;

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
		hProperties?: Properties;
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
		hProperties?: Properties;
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
			style: string;
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
		transmissionInline: TransmissionInline;
		transmissionBlock: TransmissionBlock;
		transmissionFragment: TransmissionFragment;
		poeticLine: PoeticLine;
	}
}
