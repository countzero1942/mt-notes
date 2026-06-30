import { describe, expect, test } from 'vitest';
import { parseTxMarkdown } from '@/lib/transmission/tx-md-parser';

describe('tx-headings', () => {
  describe('Basic Tx Headings', () => {
    test('Heading 1', async () => {
      const markdown = '.h1 Heading 1';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<h1>Heading 1</h1>');
    });

    test('Heading 2', async () => {
      const markdown = '.h2 Heading 2';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<h2>Heading 2</h2>');
    });

    test('Heading 3', async () => {
      const markdown = '.h3 Heading 3';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<h3>Heading 3</h3>');
    });

    test('Heading 4', async () => {
      const markdown = '.h4 Heading 4';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<h4>Heading 4</h4>');
    });

    test('Heading 5', async () => {
      const markdown = '.h5 Heading 5';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<h5>Heading 5</h5>');
    });

    test('Heading 6', async () => {
      const markdown = '.h6 Heading 6';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<h6>Heading 6</h6>');
    });

    test('Heading 7 (unknown, falls back to paragraph)', async () => {
      const markdown = '.h7 Heading 7';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<p>.h7 Heading 7</p>');
    });

    test('Heading 0 (unknown, falls back to paragraph)', async () => {
      const markdown = '.h0 Heading 0';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<p>.h0 Heading 0</p>');
    });
  }); // Basic Tx Headings

  describe('Tx Headings with Tx Inline Formatting', () => {
    test('Heading 3 with tx bold', async () => {
      const markdown = '.h3 A .b{Bold} Heading';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<h3>A <strong>Bold</strong> Heading</h3>'
      );
    });

    test('Heading 3 with tx bold at start', async () => {
      const markdown = '.h3 .b{A Bold} Heading';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<h3><strong>A Bold</strong> Heading</h3>'
      );
    });

    test('Heading 3 with tx italic', async () => {
      const markdown = '.h3 An .i{Italic} Heading';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<h3>An <em>Italic</em> Heading</h3>'
      );
    });

    test('Heading 3 with tx bold and italic', async () => {
      const markdown = '.h3 A .b{Bold} .i{Italic} Heading';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<h3>A <strong>Bold</strong> <em>Italic</em> Heading</h3>'
      );
    });

    test('Heading 3 with tx bold and italic recursive', async () => {
      const markdown = '.h3 .b{Bold .i{Italic}} Heading';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<h3><strong>Bold <em>Italic</em></strong> Heading</h3>'
      );
    });

    test('Heading 3 with tx many nested recursive', async () => {
      const markdown =
        '.h3 .b{Bold .i{Italic .u{Underline}}} Heading';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<h3><strong>Bold <em>Italic <u>Underline</u></em></strong> Heading</h3>'
      );
    });

    test('Heading 3 with tx quoted nested recursive', async () => {
      const markdown =
        '.h3 .q{Quoted .b{Bold .i{Italic .u{Underline}}}} Heading';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<h3><q>Quoted <strong>Bold <em>Italic <u>Underline</u></em></strong></q> Heading</h3>'
      );
    });
  }); // Tx Headings with Tx Inline Formatting

  describe('Tx Headings with Tx-Markdown Mixed - Linear', () => {
    test('Heading 3 with markdown bold and tx italic', async () => {
      const markdown = '.h3 **Bold** .i{Italic} Heading';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<h3><strong>Bold</strong> <em>Italic</em> Heading</h3>'
      );
    });

    test('Heading 3 with tx bold and markdown italic', async () => {
      const markdown = '.h3 .b{Bold} *Italic* Heading';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<h3><strong>Bold</strong> <em>Italic</em> Heading</h3>'
      );
    });
  }); // Tx Headings with Tx-Markdown Mixed - Linear

  describe('Tx Headings with Tx-Markdown Mixed - Tx wraps Markdown', () => {
    test('Heading 3 with tx bold wraps markdown italic', async () => {
      const markdown = '.h3 .b{Bold *Italic*} Heading';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<h3><strong>Bold <em>Italic</em></strong> Heading</h3>'
      );
    });

    test('Heading 3 with tx italic wraps markdown bold', async () => {
      const markdown = '.h3 .i{Italic **Bold**} Heading';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<h3><em>Italic <strong>Bold</strong></em> Heading</h3>'
      );
    });

    test('Heading 3 with tx bold wraps markdown italic - with prefix', async () => {
      const markdown = '.h3 A .b{Bold *Italic*} Heading';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<h3>A <strong>Bold <em>Italic</em></strong> Heading</h3>'
      );
    });

    test('Heading 3 with tx italic wraps markdown bold - with prefix', async () => {
      const markdown = '.h3 An .i{Italic **Bold**} Heading';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<h3>An <em>Italic <strong>Bold</strong></em> Heading</h3>'
      );
    });
  }); // Tx Headings with Tx-Markdown Mixed - Tx wraps Markdown

  describe('Tx Headings with Tx-Markdown Mixed - Markdown wraps Tx', () => {
    test('Heading 3 with markdown bold wraps tx italic', async () => {
      const markdown = '.h3 **Bold .i{Italic}** Heading';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<h3><strong>Bold <em>Italic</em></strong> Heading</h3>'
      );
    });

    test('Heading 3 with markdown italic wraps tx bold', async () => {
      const markdown = '.h3 *Italic .b{Bold} Heading*';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<h3><em>Italic <strong>Bold</strong> Heading</em></h3>'
      );
    });

    test('Heading 3 with markdown bold wraps tx italic - with prefix', async () => {
      const markdown = '.h3 A **Bold .i{Italic}** Heading';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<h3>A <strong>Bold <em>Italic</em></strong> Heading</h3>'
      );
    });

    test('Heading 3 with markdown italic wraps tx bold - with prefix', async () => {
      const markdown = '.h3 An *Italic .b{Bold} Heading*';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<h3>An <em>Italic <strong>Bold</strong> Heading</em></h3>'
      );
    });

    test('Heading 3 with markdown italic wraps tx bold - standalone', async () => {
      const markdown = '.h3 *Italic .b{Bold}*';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<h3><em>Italic <strong>Bold</strong></em></h3>'
      );
    });

    test('Heading 3 with markdown italic wraps tx bold - with suffix', async () => {
      const markdown = '.h3 *Italic .b{Bold}* Heading';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<h3><em>Italic <strong>Bold</strong></em> Heading</h3>'
      );
    });
  }); // Tx Headings with Tx-Markdown Mixed - Markdown wraps Tx

  describe('Tx Edge Cases - Malformed Heading Tags', () => {
    test('Heading tag without space - ignored', async () => {
      const markdown = '.h3';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<p>.h3</p>');
    });

    test('Heading tag with space but no content - ignored', async () => {
      const markdown = '.h3 ';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<p>.h3</p>');
    });

    test('Heading tag with only whitespace - ignored', async () => {
      const markdown = '.h3   ';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<p>.h3</p>');
    });

    test('Invalid heading tag number - ignored', async () => {
      const markdown = '.h9 Invalid Heading';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<p>.h9 Invalid Heading</p>');
    });

    test('Heading tag with colon instead of space - treated as block tag', async () => {
      const markdown = '.h3: Content';
      const html = await parseTxMarkdown(markdown);
      // Should be treated as block tag (not heading)
      expect(html).not.toContain('<h3>');
    });
  }); // 'Tx Edge Cases - Malformed Heading Tags'
});
