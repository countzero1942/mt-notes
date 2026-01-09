import { describe, expect, test } from "vitest";
import { parseTxMarkdown } from "@/lib/transmission/tx-md-parser";

describe("tx-basics", () => {
	describe("Basic Tx Headings", () => {
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

		test("Heading 7 (unknown, falls back to paragraph)", async () => {
			const markdown = ".h7 Heading 7";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>.h7 Heading 7</p>");
		});

		test("Heading 0 (unknown, falls back to paragraph)", async () => {
			const markdown = ".h0 Heading 0";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>.h0 Heading 0</p>");
		});
	});

	describe("Tx Text - Basic Inline Formatting", () => {
		test("Text with tx bold", async () => {
			const markdown = "A .b{Bold} Text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>A <strong>Bold</strong> Text</p>");
		});

		test("Text with tx bold at start", async () => {
			const markdown = ".b{Bold} Text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p><strong>Bold</strong> Text</p>");
		});

		test("Text with tx bold at end", async () => {
			const markdown = "Very .b{Bold}";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>Very <strong>Bold</strong></p>");
		});

		test("Text with tx bold followed by period", async () => {
			const markdown = "Very .b{Bold}.";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>Very <strong>Bold</strong>.</p>");
		});

		test("Text with tx bold followed by exclamation", async () => {
			const markdown = "Very .b{Bold}!";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>Very <strong>Bold</strong>!</p>");
		});

		test("Text with tx bold and italic", async () => {
			const markdown = "Very .b{Bold} and .i{Italic}!";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>Very <strong>Bold</strong> and <em>Italic</em>!</p>");
		});

		test("Text with tx bold and italic no spacing", async () => {
			const markdown = "A .b{Bold}.i{Italic}Word text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>A <strong>Bold</strong><em>Italic</em>Word text</p>");
		});

		test("Text with tx bold and italic recursive", async () => {
			const markdown = ".b{Bold .i{Italic}} text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p><strong>Bold <em>Italic</em></strong> text</p>");
		});

		test("Text with tx bold and italic recursive - with prefix", async () => {
			const markdown = "A .b{Bold .i{Italic}} text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>A <strong>Bold <em>Italic</em></strong> text</p>");
		});

		test("Text with tx many nested recursive", async () => {
			const markdown = ".b{Bold .i{Italic .u{Underline}}} text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p><strong>Bold <em>Italic <u>Underline</u></em></strong> text</p>");
		});

		test("Text with tx many nested recursive - with prefix", async () => {
			const markdown = "A .b{Bold .i{Italic .u{Underline}}} text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>A <strong>Bold <em>Italic <u>Underline</u></em></strong> text</p>");
		});

		test("Text with tx quoted nested recursive", async () => {
			const markdown = "A .q{Quoted .b{Bold .i{Italic .u{Underline}}}} text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>A <q>Quoted <strong>Bold <em>Italic <u>Underline</u></em></strong></q> text</p>");
		});
	});

	describe("Tx Headings with Tx Inline Formatting", () => {
		test("Heading 3 with tx bold", async () => {
			const markdown = ".h3 A .b{Bold} Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3>A <strong>Bold</strong> Heading</h3>");
		});

		test("Heading 3 with tx bold at start", async () => {
			const markdown = ".h3 .b{A Bold} Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3><strong>A Bold</strong> Heading</h3>");
		});

		test("Heading 3 with tx italic", async () => {
			const markdown = ".h3 An .i{Italic} Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3>An <em>Italic</em> Heading</h3>");
		});

		test("Heading 3 with tx bold and italic", async () => {
			const markdown = ".h3 A .b{Bold} .i{Italic} Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3>A <strong>Bold</strong> <em>Italic</em> Heading</h3>");
		});

		test("Heading 3 with tx bold and italic recursive", async () => {
			const markdown = ".h3 .b{Bold .i{Italic}} Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3><strong>Bold <em>Italic</em></strong> Heading</h3>");
		});

		test("Heading 3 with tx many nested recursive", async () => {
			const markdown = ".h3 .b{Bold .i{Italic .u{Underline}}} Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3><strong>Bold <em>Italic <u>Underline</u></em></strong> Heading</h3>");
		});

		test("Heading 3 with tx quoted nested recursive", async () => {
			const markdown = ".h3 .q{Quoted .b{Bold .i{Italic .u{Underline}}}} Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3><q>Quoted <strong>Bold <em>Italic <u>Underline</u></em></strong></q> Heading</h3>");
		});
	});

	describe("Text with Tx-Markdown Mixed - Linear", () => {
		test("Markdown bold and tx italic", async () => {
			const markdown = "**Bold** .i{Italic} text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p><strong>Bold</strong> <em>Italic</em> text</p>");
		});

		test("Tx bold and markdown italic", async () => {
			const markdown = ".b{Bold} *Italic* text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p><strong>Bold</strong> <em>Italic</em> text</p>");
		});
	});

	describe("Text with Tx-Markdown Mixed - Tx wraps Markdown", () => {
		test("Tx bold wraps markdown italic", async () => {
			const markdown = ".b{Bold *Italic*} text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p><strong>Bold <em>Italic</em></strong> text</p>");
		});

		test("Tx bold wraps markdown italic - with prefix", async () => {
			const markdown = "A .b{Bold *Italic*} text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>A <strong>Bold <em>Italic</em></strong> text</p>");
		});

		test("Tx italic wraps markdown bold", async () => {
			const markdown = ".i{Italic **Bold**} text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p><em>Italic <strong>Bold</strong></em> text</p>");
		});

		test("Tx italic wraps markdown bold - standalone", async () => {
			const markdown = ".i{**Bold**} text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p><em><strong>Bold</strong></em> text</p>");
		});

		test("Tx italic wraps markdown bold - no text after", async () => {
			const markdown = ".i{**Bold**}";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p><em><strong>Bold</strong></em></p>");
		});

		test("Tx italic wraps markdown bold with text", async () => {
			const markdown = ".i{**Bold** Text}";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p><em><strong>Bold</strong> Text</em></p>");
		});

		test("Tx italic wraps markdown bold with prefix and suffix", async () => {
			const markdown = "An .i{Italic **Bold** kind of} text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>An <em>Italic <strong>Bold</strong> kind of</em> text</p>");
		});
	});

	describe("Text with Tx-Markdown Mixed - Markdown wraps Tx", () => {
		test("Markdown bold wraps tx italic", async () => {
			const markdown = "**Bold .i{Italic}** text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p><strong>Bold <em>Italic</em></strong> text</p>");
		});

		test("Markdown italic wraps tx bold", async () => {
			const markdown = "*Italic .b{Bold} text*";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p><em>Italic <strong>Bold</strong> text</em></p>");
		});

		test("Markdown bold wraps tx italic - with prefix", async () => {
			const markdown = "A **Bold .i{Italic}** text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>A <strong>Bold <em>Italic</em></strong> text</p>");
		});

		test("Markdown italic wraps tx bold - with prefix", async () => {
			const markdown = "An *Italic .b{Bold} text*";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>An <em>Italic <strong>Bold</strong> text</em></p>");
		});

		test("Markdown italic wraps tx bold - standalone", async () => {
			const markdown = "*Italic .b{Bold}*";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p><em>Italic <strong>Bold</strong></em></p>");
		});

		test("Markdown italic wraps tx nested - quoted, bold, underline", async () => {
			const markdown = "*Italic .q{.b{Bold .u{Underline}}}* text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p><em>Italic <q><strong>Bold <u>Underline</u></strong></q></em> text</p>");
		});

		test("Deep nesting - markdown wraps markdown wraps tx wraps tx wraps tx", async () => {
			const markdown = "_Italic **Very .q{.b{Bold .u{Underline}}}**_ text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p><em>Italic <strong>Very <q><strong>Bold <u>Underline</u></strong></q></strong></em> text</p>");
		});
	});

	describe("Tx Headings with Tx-Markdown Mixed - Linear", () => {
		test("Heading 3 with markdown bold and tx italic", async () => {
			const markdown = ".h3 **Bold** .i{Italic} Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3><strong>Bold</strong> <em>Italic</em> Heading</h3>");
		});

		test("Heading 3 with tx bold and markdown italic", async () => {
			const markdown = ".h3 .b{Bold} *Italic* Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3><strong>Bold</strong> <em>Italic</em> Heading</h3>");
		});
	});

	describe("Tx Headings with Tx-Markdown Mixed - Tx wraps Markdown", () => {
		test("Heading 3 with tx bold wraps markdown italic", async () => {
			const markdown = ".h3 .b{Bold *Italic*} Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3><strong>Bold <em>Italic</em></strong> Heading</h3>");
		});

		test("Heading 3 with tx italic wraps markdown bold", async () => {
			const markdown = ".h3 .i{Italic **Bold**} Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3><em>Italic <strong>Bold</strong></em> Heading</h3>");
		});

		test("Heading 3 with tx bold wraps markdown italic - with prefix", async () => {
			const markdown = ".h3 A .b{Bold *Italic*} Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3>A <strong>Bold <em>Italic</em></strong> Heading</h3>");
		});

		test("Heading 3 with tx italic wraps markdown bold - with prefix", async () => {
			const markdown = ".h3 An .i{Italic **Bold**} Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3>An <em>Italic <strong>Bold</strong></em> Heading</h3>");
		});
	});

	describe("Tx Headings with Tx-Markdown Mixed - Markdown wraps Tx", () => {
		test("Heading 3 with markdown bold wraps tx italic", async () => {
			const markdown = ".h3 **Bold .i{Italic}** Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3><strong>Bold <em>Italic</em></strong> Heading</h3>");
		});

		test("Heading 3 with markdown italic wraps tx bold", async () => {
			const markdown = ".h3 *Italic .b{Bold} Heading*";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3><em>Italic <strong>Bold</strong> Heading</em></h3>");
		});

		test("Heading 3 with markdown bold wraps tx italic - with prefix", async () => {
			const markdown = ".h3 A **Bold .i{Italic}** Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3>A <strong>Bold <em>Italic</em></strong> Heading</h3>");
		});

		test("Heading 3 with markdown italic wraps tx bold - with prefix", async () => {
			const markdown = ".h3 An *Italic .b{Bold} Heading*";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3>An <em>Italic <strong>Bold</strong> Heading</em></h3>");
		});

		test("Heading 3 with markdown italic wraps tx bold - standalone", async () => {
			const markdown = ".h3 *Italic .b{Bold}*";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3><em>Italic <strong>Bold</strong></em></h3>");
		});

		test("Heading 3 with markdown italic wraps tx bold - with suffix", async () => {
			const markdown = ".h3 *Italic .b{Bold}* Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<h3><em>Italic <strong>Bold</strong></em> Heading</h3>");
		});
	});

	describe("Tx with LaTeX", () => {
		test("LaTeX standalone", async () => {
			const markdown = "$r>g$";
			const html = await parseTxMarkdown(markdown);
			expect(html).toContain("katex");
		});

		test("LaTeX in text", async () => {
			const markdown = "This is $r>g$";
			const html = await parseTxMarkdown(markdown);
			expect(html).toContain("This is");
			expect(html).toContain("katex");
		});

		test("Tx italic and LaTeX", async () => {
			const markdown = "This is .i{Italic} and some math: $r>g$";
			const html = await parseTxMarkdown(markdown);
			expect(html).toContain("<em>Italic</em>");
			expect(html).toContain("katex");
		});

		test("Heading 3 with tx italic and LaTeX", async () => {
			const markdown = ".h3 .i{Italic} Heading $r>g$";
			const html = await parseTxMarkdown(markdown);
			expect(html).toContain("<h3>");
			expect(html).toContain("<em>Italic</em>");
			expect(html).toContain("katex");
		});
	});

	describe("Tx Edge Cases - Malformed Heading Tags", () => {
		test("Heading tag without space - ignored", async () => {
			const markdown = ".h3";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>.h3</p>");
		});

		test("Heading tag with space but no content - ignored", async () => {
			const markdown = ".h3 ";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>.h3</p>");
		});

		test("Heading tag with only whitespace - ignored", async () => {
			const markdown = ".h3   ";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>.h3</p>");
		});

		test("Invalid heading tag number - ignored", async () => {
			const markdown = ".h9 Invalid Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>.h9 Invalid Heading</p>");
		});

		test("Heading tag with colon instead of space - treated as block tag", async () => {
			const markdown = ".h3: Content";
			const html = await parseTxMarkdown(markdown);
			// Should be treated as block tag (not heading)
			expect(html).not.toContain("<h3>");
		});
	});

	describe("Tx Edge Cases - Malformed Inline Tags", () => {
		test("Unclosed inline tag - ignored", async () => {
			const markdown = "Text with .b{Bold tag";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>Text with .b{Bold tag</p>");
		});

		test("Empty inline tag - creates empty element", async () => {
			const markdown = "Text with .b{} empty";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>Text with  empty</p>");
		});

		test("Inline tag without opening brace - ignored", async () => {
			const markdown = "Text with .b Bold}";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>Text with .b Bold}</p>");
		});

		test("Inline tag without closing brace - ignored", async () => {
			const markdown = "Text with .b{Bold";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>Text with .b{Bold</p>");
		});

		test("Just the tag name - ignored", async () => {
			const markdown = "Text with .b alone";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>Text with .b alone</p>");
		});

		test("Nested unclosed tags - outer ignored, inner processes", async () => {
			const markdown = "Text with .b{Bold .i{Italic} text";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>Text with .b{Bold <em>Italic</em> text</p>");
		});

		test("Escaped opening brace - treated as text", async () => {
			const markdown = "Text with .b\\{Bold}";
			const html = await parseTxMarkdown(markdown);
			// Should not be processed as tag
			expect(html).toBe("<p>Text with .b{Bold}</p>");
		});

		test("Escaped closing brace - treated as text inside tag", async () => {
			const markdown = "Text with .b{Bold \\} still bold}";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>Text with <strong>Bold } still bold</strong></p>");
		});

		test("Double escaped closing brace", async () => {
			const markdown = "Text with .b{Bold \\\\} outside";
			const html = await parseTxMarkdown(markdown);
			// \\ becomes single backslash, } closes tag
			expect(html).toBe("<p>Text with <strong>Bold \\</strong> outside</p>");
		});
	});

	describe("Tx Edge Cases - Unknown Tags", () => {
		test("Unknown inline tag - ignored", async () => {
			const markdown = "Text with .unknown{content}";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>Text with .unknown{content}</p>");
		});

		test("Unknown heading tag - ignored", async () => {
			const markdown = ".hx Unknown Heading";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>.hx Unknown Heading</p>");
		});

		test("Tag with invalid characters - ignored", async () => {
			const markdown = "Text with .b-old{content}";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>Text with .b-old{content}</p>");
		});

		test("Tag with numbers - ignored if not configured", async () => {
			const markdown = "Text with .tag123{content}";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>Text with .tag123{content}</p>");
		});
	});

	describe("Tx Edge Cases - Spacing and Whitespace", () => {
		test("Tag with leading space - ignored", async () => {
			const markdown = "Text with . b{Bold}";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>Text with . b{Bold}</p>");
		});

		test("Tag with space before opening brace - ignored", async () => {
			const markdown = "Text with .b {Bold}";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>Text with .b {Bold}</p>");
		});

		test("Tag with newline in content - preserved", async () => {
			const markdown = "Text with .b{Bold\ntext}";
			const html = await parseTxMarkdown(markdown);
			expect(html).toContain("<strong>");
			expect(html).toContain("Bold");
			expect(html).toContain("text");
		});

		test("Multiple spaces between tags", async () => {
			const markdown = ".b{Bold}    .i{Italic}";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p><strong>Bold</strong>    <em>Italic</em></p>");
		});
	});

	describe("Tx Edge Cases - Variant Syntax", () => {
		test("Variant without tag name - ignored", async () => {
			const markdown = "Text with ..variant{content}";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>Text with ..variant{content}</p>");
		});

		test("Multiple dots in variant - only first treated as variant", async () => {
			const markdown = "Text with .b.var.extra{content}";
			const html = await parseTxMarkdown(markdown);
			// Should parse as tag=b, variant=var, then .extra{ is ignored
			expect(html).toBe("<p>Text with .b.var.extra{content}</p>");
		});

		test("Variant without content - ignored", async () => {
			const markdown = "Text with .b.variant";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p>Text with .b.variant</p>");
		});
	});

	describe("Tx Edge Cases - Nesting Edge Cases", () => {
		test("Same tag nested in itself", async () => {
			const markdown = ".b{Bold .b{nested bold}}";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p><strong>Bold <strong>nested bold</strong></strong></p>");
		});

		test("Deeply nested same tags", async () => {
			const markdown = ".b{One .b{Two .b{Three}}}";
			const html = await parseTxMarkdown(markdown);
			expect(html).toBe("<p><strong>One <strong>Two <strong>Three</strong></strong></strong></p>");
		});

		test("Crossing nesting boundaries with markdown", async () => {
			const markdown = ".b{Bold **still .i{italic** and bold}}";
			const html = await parseTxMarkdown(markdown);
			// Markdown bold should close before italic in tx
			expect(html).toContain("<strong>");
			expect(html).toContain("<em>");
		});
	});
});
