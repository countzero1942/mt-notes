import { describe, expect, test } from "vitest";
import { parseTxMarkdown } from "@/lib/transmission/tx-md-parser";

describe("tx-basics", () => {
	describe("Basic Headings", () => {
		test("Heading 1", async () => {
			const markdown = ".h1 Heading 1";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h1>Heading 1</h1>");
		});

		test("Heading 2", async () => {
			const markdown = ".h2 Heading 2";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h2>Heading 2</h2>");
		});

		test("Heading 3", async () => {
			const markdown = ".h3 Heading 3";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3>Heading 3</h3>");
		});

		test("Heading 4", async () => {
			const markdown = ".h4 Heading 4";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h4>Heading 4</h4>");
		});

		test("Heading 5", async () => {
			const markdown = ".h5 Heading 5";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h5>Heading 5</h5>");
		});

		test("Heading 6", async () => {
			const markdown = ".h6 Heading 6";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h6>Heading 6</h6>");
		});

		test("Heading 7", async () => {
			const markdown = ".h7 Heading 7";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>.h7 Heading 7</p>");
		});
	});

	describe("Headings with Tx Inline Formatting", () => {
		test("Heading 1 With Tx Bold", async () => {
			const markdown = ".h1 .b{Bold} Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h1><strong>Bold</strong>Heading</h1>");
		});

		test("Heading 1 With Tx Italic", async () => {
			const markdown = ".h1 .i{Italic} Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h1><em>Italic</em>Heading</h1>");
		});

		test("Heading 1 With Tx Bold and Italic", async () => {
			const markdown = ".h1 .b{Bold} .i{Italic} Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe(
				"<h1><strong>Bold</strong> <em>Italic</em>Heading</h1>",
			);
		});

		test("Heading 1 With Tx Bold and Italic Recursive", async () => {
			const markdown = ".h1 .b{Bold .i{Italic}} Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h1><strong>Bold<em>Italic</em></strong>Heading</h1>");
		});
	});

	describe("Headings with Mixed Tx and Markdown Formatting", () => {
		test("Heading 1 With Tx-Markdown Bold and Italic", async () => {
			const markdown = ".h1 **Bold** .i{Italic} Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h1><strong>Bold</strong><em>Italic</em>Heading</h1>");
		});

		test("Heading 1 With Tx-Markdown Bold and Italic", async () => {
			const markdown = ".h1 .b{Bold} *Italic* Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h1><strong>Bold</strong><em>Italic</em>Heading</h1>");
		});

		test("Heading 1 With Tx-Markdown Bold and Italic Recursive", async () => {
			const markdown = ".h1 **Bold .i{Italic}** Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h1><strong>Bold<em>Italic</em></strong>Heading</h1>");
		});

		test("Heading 1 With Tx-Markdown Bold and Italic Recursive", async () => {
			const markdown = ".h1 *Italic .b{Bold}* Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h1><em>Italic<strong>Bold</strong></em>Heading</h1>");
		});

		test("Heading 1 With Tx Bold and Italic Recursive", async () => {
			const markdown = ".h1 .b{Bold *Italic*} Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h1><strong>Bold<em>Italic</em></strong>Heading</h1>");
		});

		test("Heading 1 With Tx Bold and Italic Recursive", async () => {
			const markdown = ".h1 .i{Italic **Bold**} Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h1><em>Italic<strong>Bold</strong></em>Heading</h1>");
		});

		test("Heading 1 With Tx Bold, Italic, Latex", async () => {
			const markdown = ".h3 .i{Italic} Heading $r>g$ ";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe(
				'<h1><em>Italic</em>Heading <mark class="tx-highlight tx-hl-r">r>g</mark></h1>',
			);
		});
	});
});
