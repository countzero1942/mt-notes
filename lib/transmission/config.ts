// src/config.ts

import type { TxConfig } from "./types";

/**
 * Default Transmission configuration
 * This provides sensible defaults for common use cases
 */
export const defaultTxConfig: TxConfig = {
	classPrefix: "tx-",
	indentUnit: "2em",
	scannableMdNodes: ["strong", "emphasis", "delete"],

	inline: {
		// Semantic HTML mappings (no classes needed)
		b: { strategy: "markdown", mdType: "strong" },
		i: { strategy: "markdown", mdType: "emphasis" },
		s: { strategy: "markdown", mdType: "delete" },
		code: { strategy: "markdown", mdType: "inlineCode" },

		// Styled elements
		hl: {
			strategy: "html",
			htmlTag: "mark",
			className: (v) => (v ? `tx-highlight tx-hl-${v}` : "tx-highlight"),
			variants: {
				g: "gold",
				y: "yellow",
				b: "blue",
				r: "red",
				gr: "green",
				p: "purple",
			},
		},

		u: { strategy: "html", htmlTag: "u" },
		sup: { strategy: "html", htmlTag: "sup" },
		kbd: { strategy: "html", htmlTag: "kbd" },
		sub: { strategy: "html", htmlTag: "sub" },
		q: { strategy: "html", htmlTag: "q" },
		cite: { strategy: "html", htmlTag: "cite" },
		abbr: { strategy: "html", htmlTag: "abbr" },
		dfn: { strategy: "html", htmlTag: "dfn" },
		data: { strategy: "html", htmlTag: "data" },
		time: { strategy: "html", htmlTag: "time" },
		mark: { strategy: "html", htmlTag: "mark" },
	},

	heading: {
		h1: { strategy: "markdown", mdType: "heading", level: 1 },
		h2: { strategy: "markdown", mdType: "heading", level: 2 },
		h3: { strategy: "markdown", mdType: "heading", level: 3 },
		h4: { strategy: "markdown", mdType: "heading", level: 4 },
		h5: { strategy: "markdown", mdType: "heading", level: 5 },
		h6: { strategy: "markdown", mdType: "heading", level: 6 },
	},

	block: {
		// Markdown blocks
		bq: {
			strategy: "markdown",
			mdType: "blockquote",
			headingTarget: "ignore",
		},

		ul: {
			strategy: "markdown",
			mdType: "list",
			headingTarget: "placeBefore",
		},

		ol: {
			strategy: "markdown",
			mdType: "list",
			headingTarget: "placeBefore",
		},

		// HTML semantic blocks
		details: {
			strategy: "html",
			htmlTag: "details",
			headingTarget: "summary",
		},

		figure: {
			strategy: "html",
			htmlTag: "figure",
			headingTarget: "figcaption",
		},

		aside: {
			strategy: "html",
			htmlTag: "aside",
		},

		// Callouts with variants
		co: {
			strategy: "html",
			htmlTag: "aside",
			className: (v) => `tx-callout tx-callout-${v || "info"}`,
			ariaRole: "note",
			ariaLabel: (v) => {
				const labels: Record<string, string> = {
					info: "Information",
					warn: "Warning",
					err: "Error",
					tip: "Tip",
					sum: "Summary",
					note: "Note",
					important: "Important notice",
					question: "Question",
				};
				return labels[v || "info"] || "Note";
			},
			variants: {
				info: "information",
				warn: "warning",
				err: "error",
				tip: "tip",
				sum: "summary",
				note: "note",
				important: "important",
				question: "question",
			},
		},
	},
};

/**
 * Merge user config with defaults
 */
export function mergeTxConfig(userConfig: Partial<TxConfig>): TxConfig {
	return {
		classPrefix: userConfig.classPrefix ?? defaultTxConfig.classPrefix,
		indentUnit: userConfig.indentUnit ?? defaultTxConfig.indentUnit,
		scannableMdNodes:
			userConfig.scannableMdNodes ?? defaultTxConfig.scannableMdNodes,
		inline: { ...defaultTxConfig.inline, ...userConfig.inline },
		heading: { ...defaultTxConfig.heading, ...userConfig.heading },
		block: { ...defaultTxConfig.block, ...userConfig.block },
	};
}
