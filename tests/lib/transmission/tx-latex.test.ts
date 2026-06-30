import { describe, expect, test } from "vitest";
import { parseTxMarkdown } from "@/lib/transmission/tx-md-parser";

describe("tx-latex", () => {
	describe("Tx with LaTeX - basics", () => {
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
	}); // 'Tx with LaTeX - basics'
});
