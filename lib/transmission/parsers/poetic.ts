// src/parsers/poetic.ts

import type { Break, BlockContent, Paragraph, PhrasingContent, Text } from "mdast";
import type { IndentedLine, PoeticLine, TxConfig } from "../types";
import { extractBracedContent, parseInlineTransmission } from "./inline";

// Poetic class names. NOTE: these are kept literally "tx-"-prefixed to match
// the fixed CSS contract in TRANSMISSION_REPORT.md ("Poetic Text
// Preservation"). classPrefix is not yet applied to poetic classes.
const CLS_LINE = "tx-line";
const CLS_LAST = "tx-last-line";
const CLS_SPACE = "tx-space";

const DEFAULT_INDENT_STRING = "\u00A0\u00A0\u00A0\u00A0"; // 4 non-breaking spaces

/** One entry in a poetic unit: a real line of text, or an in-block blank. */
type PoeticEntry =
	| { kind: "text"; content: string; indent: number }
	| { kind: "space" };

/**
 * Parse a run of poetic source lines into poetic-aware block content.
 *
 * Used for BOTH plain markdown paragraphs (a paragraph that spans multiple
 * source lines IS one poetic unit, since a truly blank line would otherwise
 * have ended the paragraph node before this function ever saw it) and block
 * dot-tag bodies (`.bq:` etc., after the block's content indent has been
 * stripped, so indents there are relative).
 *
 * Grouping rules:
 *   - A run of consecutive lines joined by single newlines forms one poetic
 *     unit; each line is preserved as its own poetic line.
 *   - A ":" line is an in-block vertical space — it keeps the unit going.
 *   - A truly blank line ends the unit (paragraph break). This can only occur
 *     within a block dot-tag body, never within a plain markdown paragraph.
 *   - A unit's first line is expected at indent 0; following lines may be
 *     indented with one or more tabs. Multiple indent-0 lines may appear (each
 *     starts a new "sentence" within the same unit).
 *
 * A unit that is a single line with no indent renders as a normal <p>; any
 * multi-line unit renders per `config.poeticTextMode`.
 */
export function parsePoeticBody(
	lines: IndentedLine[],
	config: TxConfig,
): BlockContent[] {
	const nodes: BlockContent[] = [];
	let unit: PoeticEntry[] = [];

	const flush = () => {
		if (unit.length > 0) {
			nodes.push(...renderUnit(unit, config));
			unit = [];
		}
	};

	for (const line of lines) {
		const trimmed = line.content.trim();

		if (line.isVerticalSpace || trimmed === "" || trimmed === ":") {
			if (trimmed === ":") {
				// In-block vertical space; only meaningful once the unit has content.
				if (unit.length > 0) unit.push({ kind: "space" });
			} else {
				// True blank line ends the current unit.
				flush();
			}
			continue;
		}

		// Real text line: strip leading TAB indentation (tab-only) for the
		// relative indent level; remaining leading spaces stay as content.
		let tabs = 0;
		while (tabs < line.content.length && line.content[tabs] === "\t") tabs++;
		unit.push({
			kind: "text",
			content: line.content.slice(tabs),
			indent: tabs,
		});
	}

	flush();
	return nodes;
}

/** Render one poetic unit into one or more block nodes. */
function renderUnit(entries: PoeticEntry[], config: TxConfig): BlockContent[] {
	// Trim leading/trailing in-block spaces (no dangling gaps).
	let start = 0;
	let end = entries.length;
	while (start < end && entries[start].kind === "space") start++;
	while (end > start && entries[end - 1].kind === "space") end--;
	const trimmed = entries.slice(start, end);
	if (trimmed.length === 0) return [];

	const textEntries = trimmed.filter((e) => e.kind === "text");

	// Single bare line with no indent => an ordinary paragraph.
	if (
		trimmed.length === 1 &&
		textEntries.length === 1 &&
		textEntries[0].kind === "text" &&
		textEntries[0].indent === 0
	) {
		const para: Paragraph = {
			type: "paragraph",
			children: parseInlineTransmission(textEntries[0].content, config),
		};
		return [para];
	}

	// An inline dot-tag whose braces span more than one of these lines (e.g.
	// ".b{Bold\ntext}") is NOT poetic text — it's one inline tag whose content
	// happens to contain a literal newline, which must be preserved verbatim.
	// Treat the whole unit as one ordinary paragraph in that case, rather than
	// splitting it into separate poetic lines.
	const rejoined = rejoinEntries(trimmed);
	if (hasInlineTagSpanningNewline(rejoined)) {
		const para: Paragraph = {
			type: "paragraph",
			children: parseInlineTransmission(rejoined, config),
		};
		return [para];
	}

	const mode = config.poeticTextMode ?? "CssClassLines";
	return mode === "LineBreaks"
		? [renderLineBreaks(trimmed, config)]
		: renderCssClassLines(trimmed, config);
}

/** Reconstruct a unit's original raw multi-line text (tabs + ":" restored). */
function rejoinEntries(entries: PoeticEntry[]): string {
	return entries
		.map((e) => (e.kind === "space" ? ":" : "\t".repeat(e.indent) + e.content))
		.join("\n");
}

/**
 * True if `text` contains an inline dot-tag (`.tag{...}`) whose matching
 * closing brace is on a different line than its opening brace — i.e. the
 * tag's content itself contains a literal newline.
 */
function hasInlineTagSpanningNewline(text: string): boolean {
	const dotTagRegex = /\.(\w+)(?:\.(\w+))?\{/g;
	let match: RegExpExecArray | null;
	match = dotTagRegex.exec(text);
	while (match) {
		const contentStart = match.index + match[0].length;
		const { content, endPos } = extractBracedContent(text, contentStart);
		if (endPos === -1) {
			// Unclosed tag - nothing spans, keep scanning past it.
			dotTagRegex.lastIndex = contentStart;
			match = dotTagRegex.exec(text);
			continue;
		}
		if (content.includes("\n")) return true;
		dotTagRegex.lastIndex = endPos + 1;
		match = dotTagRegex.exec(text);
	}
	return false;
}

/**
 * "CssClassLines": one <p class="tx-line" style="--tx-indent: N"> per line,
 * per TRANSMISSION_REPORT.md. The CSS variable alone carries the indent — no
 * separate tx-indent-N class is needed; the CSS contract reads the variable
 * directly (`padding-left: calc(var(--tx-indent, 0) * 2em)`).
 */
function renderCssClassLines(
	entries: PoeticEntry[],
	config: TxConfig,
): PoeticLine[] {
	const out: PoeticLine[] = [];

	// Index of the last text entry, to receive tx-last-line.
	let lastTextIdx = -1;
	for (let i = 0; i < entries.length; i++) {
		if (entries[i].kind === "text") lastTextIdx = i;
	}

	entries.forEach((entry, i) => {
		if (entry.kind === "space") {
			out.push(makePoeticLine([], 0, [CLS_LINE, CLS_SPACE]));
			return;
		}
		const classes = [CLS_LINE];
		if (i === lastTextIdx) classes.push(CLS_LAST);
		out.push(
			makePoeticLine(
				parseInlineTransmission(entry.content, config),
				entry.indent,
				classes,
			),
		);
	});

	return out;
}

function makePoeticLine(
	children: PhrasingContent[],
	indent: number,
	className: string[],
): PoeticLine {
	return {
		type: "poeticLine",
		indent,
		children,
		data: {
			hName: "p",
			hProperties: { className, style: `--tx-indent: ${indent}` },
		},
	};
}

/** "LineBreaks": one <p> with <br/> between lines; indent via indentString. */
function renderLineBreaks(entries: PoeticEntry[], config: TxConfig): Paragraph {
	const indentString = config.indentString ?? DEFAULT_INDENT_STRING;
	const children: PhrasingContent[] = [];
	let emittedText = false;

	for (const entry of entries) {
		if (entry.kind === "space") {
			// Extra break => visual blank line within the same paragraph.
			children.push(breakNode());
			continue;
		}
		if (emittedText) children.push(breakNode());
		emittedText = true;
		if (entry.indent > 0) {
			const prefix: Text = {
				type: "text",
				value: indentString.repeat(entry.indent),
			};
			children.push(prefix);
		}
		children.push(...parseInlineTransmission(entry.content, config));
	}

	return { type: "paragraph", children };
}

function breakNode(): Break {
	return { type: "break" };
}
