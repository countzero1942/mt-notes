// src/index.ts

/**
 * Transmission - Extensible markdown with dot-tag syntax
 * Main entry point
 */

export { defaultTxConfig, mergeTxConfig } from "./config";
export { rehypeTransmission } from "./rehype-transmission";
export { remarkTransmission } from "./remark-transmission";
export { parseTxMarkdown } from "./tx-md-parser";
export type {
	AttributeSchema,
	BlockComponentConfig,
	BlockHtmlConfig,
	BlockMarkdownConfig,
	BlockTagConfig,
	ComponentSpec,
	Framework,
	HeadingHtmlConfig,
	HeadingMarkdownConfig,
	HeadingTagConfig,
	HeadingTarget,
	HydrateMode,
	IndentedLine,
	InlineHtmlConfig,
	InlineMarkdownConfig,
	InlineTagConfig,
	OutputStrategy,
	ParsedAttributes,
	PoeticLine,
	TransmissionBlock,
	TransmissionFragment,
	TransmissionInline,
	TxConfig,
} from "./types";
