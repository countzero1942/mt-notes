// src/index.ts

/**
 * Transmission - Extensible markdown with dot-tag syntax
 * Main entry point
 */

export { defaultTxConfig, mergeTxConfig } from "./config.js";
export { remarkTransmission } from "./remark-transmission.js";
export type {
	AttributeSchema,
	BaseTagConfig,
	BlockTagConfig,
	HeadingTagConfig,
	IndentedLine,
	InlineTagConfig,
	OutputStrategy,
	ParsedAttributes,
	PoeticLine,
	TransmissionBlock,
	TransmissionFragment,
	TransmissionInline,
	TxConfig,
} from "./types.js";
