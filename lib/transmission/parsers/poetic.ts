// src/parsers/poetic.ts

import type { Break, BlockContent, Paragraph, PhrasingContent, Text } from "mdast";
import type { IndentedLine, PoeticLine, TxConfig } from "../types";
import { parseInlineTransmission } from "./inline";

// Poetic class names. NOTE: these are kept literally "tx-"-prefixed so the
// rehype phase (which matches `tx-line` to inject the --tx-indent style) keeps
// working. classPrefix is not yet applied to poetic classes.
const CLS_LINE = "tx-line";
const CLS_LAST = "tx-last-line";
const CLS_SPACE = "tx-space";
const CLS_INDENT = (n: number) => `tx-indent-${n}`;

const DEFAULT_INDENT_STRING = "\u00A0\u00A0\u00A0\u00A0"; // 4 non-breaking spaces

/** One entry in a poetic unit: a real line of text, or an in-block blank. */
type PoeticEntry =
	| { kind: "text"; content: string; indent: number }
	| { kind: "space" };

/**
 * Parse a block's indented body into poetic-aware block content.
 *
 * Grouping rules (operating on the body lines AFTER the block's content indent
 * has been stripped, so indents here are relative):
 *   - A run of consecutive lines joined by single newlines forms one poetic
 *     unit; each line is preserved as its own poetic line.
 *   - A ":" line is an in-block vertical space — it keeps the unit going.
 *   - A truly blank line ends the unit (paragraph break).
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

	const mode = config.poeticTextMode ?? "CssClassLines";
	return mode === "LineBreaks"
		? [renderLineBreaks(trimmed, config)]
		: renderCssClassLines(trimmed, config);
}

/** "CssClassLines": one <p class="tx-line ..."> per line. */
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
		if (entry.indent > 0) classes.push(CLS_INDENT(entry.indent));
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
		data: { hName: "p", hProperties: { className } },
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
