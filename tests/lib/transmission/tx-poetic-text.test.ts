import { describe, expect, test } from "vitest";
import { parseTxMarkdown } from "@/lib/transmission/tx-md-parser";

describe("tx-poetic-text", () => {
	describe("Tx Poetic Lines in normal Body - CssClassLines", () => {
		const paragraphs = "Paragraph 1\n\nParagraph 2\n\nParagraph 3";
		const stanza = "Roses are red\n\tViolets are blue\nSugar is sweet\n";
		const parPlusStanza =
			"This is a paragraph\n\nRoses are red\n\tViolets are blue\nSugar is sweet\n";
		const parPlusStanzaPlusPar =
			"This is a paragraph\n\nRoses are red\n\tViolets are blue\nSugar is sweet\n\nParagraph";

		test("Just Paragraphs", async () => {
			const html = await parseTxMarkdown(paragraphs);
			expect(html).toBe(
				"<p>Paragraph 1</p>\n<p>Paragraph 2</p>\n<p>Paragraph 3</p>",
			);
		});

		test("Just Poetic Lines", async () => {
			const html = await parseTxMarkdown(stanza);
			expect(html).toBe(
				'<p class="tx-line" style="--tx-indent: 0">Roses are red</p>\n<p class="tx-line" style="--tx-indent: 1">Violets are blue</p>\n<p class="tx-line tx-last-line" style="--tx-indent: 0">Sugar is sweet</p>',
			);
		});

		test("Paragraph followed by poetic lines", async () => {
			const html = await parseTxMarkdown(parPlusStanza);
			expect(html).toBe(
				'<p>This is a paragraph</p>\n<p class="tx-line" style="--tx-indent: 0">Roses are red</p>\n<p class="tx-line" style="--tx-indent: 1">Violets are blue</p>\n<p class="tx-line tx-last-line" style="--tx-indent: 0">Sugar is sweet</p>',
			);
		});

		test("Paragraph, poetic lines, then another paragraph", async () => {
			const html = await parseTxMarkdown(parPlusStanzaPlusPar);
			expect(html).toBe(
				'<p>This is a paragraph</p>\n<p class="tx-line" style="--tx-indent: 0">Roses are red</p>\n<p class="tx-line" style="--tx-indent: 1">Violets are blue</p>\n<p class="tx-line tx-last-line" style="--tx-indent: 0">Sugar is sweet</p>\n<p>Paragraph</p>',
			);
		});
	});

	describe("Tx Poetic Lines in normal Body - Linebreaks Mode", () => {
		const paragraphs = `Paragraph 1\n\nParagraph 2\n\nParagraph 3`;
		const stanza = "Roses are red\n\tViolets are blue\nSugar is sweet\n";
		const parPlusStanza =
			"This is a paragraph\n\nRoses are red\n\tViolets are blue\nSugar is sweet\n";
		const parPlusStanzaPlusPar =
			"This is a paragraph\n\nRoses are red\n\tViolets are blue\nSugar is sweet\n\nParagraph";

		test("Just Paragraphs", async () => {
			const html = await parseTxMarkdown(paragraphs);
			expect(html).toBe(
				"<p>Paragraph 1</p>\n<p>Paragraph 2</p>\n<p>Paragraph 3</p>",
			);
		});

		test("Just Poetic Lines", async () => {
			const html = await parseTxMarkdown(stanza, {
				poeticTextMode: "LineBreaks",
			});
			expect(html).toBe(
				"<p>Roses are red<br>\n\u00A0\u00A0\u00A0\u00A0Violets are blue<br>\nSugar is sweet</p>",
			);
		});

		test("Paragraph followed by poetic lines", async () => {
			const html = await parseTxMarkdown(parPlusStanza, {
				poeticTextMode: "LineBreaks",
			});
			expect(html).toBe(
				"<p>This is a paragraph</p>\n<p>Roses are red<br>\n\u00A0\u00A0\u00A0\u00A0Violets are blue<br>\nSugar is sweet</p>",
			);
		});

		test("Paragraph, poetic lines, then another paragraph", async () => {
			const html = await parseTxMarkdown(parPlusStanzaPlusPar, {
				poeticTextMode: "LineBreaks",
			});
			expect(html).toBe(
				"<p>This is a paragraph</p>\n<p>Roses are red<br>\n\u00A0\u00A0\u00A0\u00A0Violets are blue<br>\nSugar is sweet</p>\n<p>Paragraph</p>",
			);
		});
	});

	describe("Tx Poetic Lines in Block Quote - CssClassLines", () => {
		const stanza =
			".bq:\n\tRoses are red\n\t\tViolets are blue\n\tSugar is sweet\n";
		const spacer =
			".bq:\n\tFirst stanza line one\n\t\tindented line two\n\t:\n\tSecond stanza after a space\n";

		test("Multi-line body - CssClassLines (default)", async () => {
			const html = await parseTxMarkdown(stanza);
			expect(html).toBe(
				'<blockquote>\n<p class="tx-line" style="--tx-indent: 0">Roses are red</p>\n<p class="tx-line" style="--tx-indent: 1">Violets are blue</p>\n<p class="tx-line tx-last-line" style="--tx-indent: 0">Sugar is sweet</p>\n</blockquote>',
			);
		});

		test("Colon line is in-block vertical space - CssClassLines", async () => {
			const html = await parseTxMarkdown(spacer);
			expect(html).toBe(
				'<blockquote>\n<p class="tx-line" style="--tx-indent: 0">First stanza line one</p>\n<p class="tx-line" style="--tx-indent: 1">indented line two</p>\n<p class="tx-line tx-space" style="--tx-indent: 0"></p>\n<p class="tx-line tx-last-line" style="--tx-indent: 0">Second stanza after a space</p>\n</blockquote>',
			);
		});

		test("Single body line renders as a normal paragraph", async () => {
			const html = await parseTxMarkdown(
				".bq:\n\tJust a single normal line\n",
			);
			expect(html).toBe(
				"<blockquote>\n<p>Just a single normal line</p>\n</blockquote>",
			);
		});
	});

	describe("Tx Poetic Lines in Block Quote - LineBreaks Mode", () => {
		const stanza =
			".bq:\n\tRoses are red\n\t\tViolets are blue\n\tSugar is sweet\n";
		const spacer =
			".bq:\n\tFirst stanza line one\n\t\tindented line two\n\t:\n\tSecond stanza after a space\n";

		test("Multi-line body - LineBreaks mode", async () => {
			const html = await parseTxMarkdown(stanza, {
				poeticTextMode: "LineBreaks",
			});
			expect(html).toBe(
				"<blockquote>\n<p>Roses are red<br>\n\u00A0\u00A0\u00A0\u00A0Violets are blue<br>\nSugar is sweet</p>\n</blockquote>",
			);
		});

		test("Colon line is in-block vertical space - LineBreaks", async () => {
			const html = await parseTxMarkdown(spacer, {
				poeticTextMode: "LineBreaks",
			});
			expect(html).toBe(
				"<blockquote>\n<p>First stanza line one<br>\n\u00A0\u00A0\u00A0\u00A0indented line two<br>\n<br>\nSecond stanza after a space</p>\n</blockquote>",
			);
		});

		test("Single body line renders as a normal paragraph", async () => {
			const html = await parseTxMarkdown(
				".bq:\n\tJust a single normal line\n",
			);
			expect(html).toBe(
				"<blockquote>\n<p>Just a single normal line</p>\n</blockquote>",
			);
		});

		test("Custom indentString is used in LineBreaks mode", async () => {
			const html = await parseTxMarkdown(stanza, {
				poeticTextMode: "LineBreaks",
				indentString: ">>",
			});
			expect(html).toContain(">>Violets are blue<br>");
		});
	});
});
