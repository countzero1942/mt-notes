import { describe, expect, test } from 'vitest';
import { parseTxMarkdown } from '@/lib/transmission/tx-md-parser';

describe('tx-basics', () => {
  describe('Tx Text - Basic Inline Formatting', () => {
    test('Text with tx bold', async () => {
      const markdown = 'A .b{Bold} Text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p>A <strong>Bold</strong> Text</p>'
      );
    });

    test('Text with tx bold at start', async () => {
      const markdown = '.b{Bold} Text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p><strong>Bold</strong> Text</p>'
      );
    });

    test('Text with tx bold at end', async () => {
      const markdown = 'Very .b{Bold}';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p>Very <strong>Bold</strong></p>'
      );
    });

    test('Text with tx bold followed by period', async () => {
      const markdown = 'Very .b{Bold}.';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p>Very <strong>Bold</strong>.</p>'
      );
    });

    test('Text with tx bold followed by exclamation', async () => {
      const markdown = 'Very .b{Bold}!';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p>Very <strong>Bold</strong>!</p>'
      );
    });

    test('Text with tx bold and italic', async () => {
      const markdown = 'Very .b{Bold} and .i{Italic}!';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p>Very <strong>Bold</strong> and <em>Italic</em>!</p>'
      );
    });

    test('Text with tx bold and italic no spacing', async () => {
      const markdown = 'A .b{Bold}.i{Italic}Word text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p>A <strong>Bold</strong><em>Italic</em>Word text</p>'
      );
    });

    test('Text with tx bold and italic recursive', async () => {
      const markdown = '.b{Bold .i{Italic}} text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p><strong>Bold <em>Italic</em></strong> text</p>'
      );
    });

    test('Text with tx bold and italic recursive - with prefix', async () => {
      const markdown = 'A .b{Bold .i{Italic}} text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p>A <strong>Bold <em>Italic</em></strong> text</p>'
      );
    });

    test('Text with tx many nested recursive', async () => {
      const markdown =
        '.b{Bold .i{Italic .u{Underline}}} text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p><strong>Bold <em>Italic <u>Underline</u></em></strong> text</p>'
      );
    });

    test('Text with tx many nested recursive - with prefix', async () => {
      const markdown =
        'A .b{Bold .i{Italic .u{Underline}}} text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p>A <strong>Bold <em>Italic <u>Underline</u></em></strong> text</p>'
      );
    });

    test('Text with tx quoted nested recursive', async () => {
      const markdown =
        'A .q{Quoted .b{Bold .i{Italic .u{Underline}}}} text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p>A <q>Quoted <strong>Bold <em>Italic <u>Underline</u></em></strong></q> text</p>'
      );
    });
  }); // Tx Text - Basic Inline Formatting

  describe('Text with Tx-Markdown Mixed - Linear', () => {
    test('Markdown bold and tx italic', async () => {
      const markdown = '**Bold** .i{Italic} text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p><strong>Bold</strong> <em>Italic</em> text</p>'
      );
    });

    test('Tx bold and markdown italic', async () => {
      const markdown = '.b{Bold} *Italic* text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p><strong>Bold</strong> <em>Italic</em> text</p>'
      );
    });
  }); // Text with Tx-Markdown Mixed - Linear

  describe('Text with Tx-Markdown Mixed - Tx wraps Markdown', () => {
    test('Tx bold wraps markdown italic', async () => {
      const markdown = '.b{Bold *Italic*} text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p><strong>Bold <em>Italic</em></strong> text</p>'
      );
    });

    test('Tx bold wraps markdown italic - with prefix', async () => {
      const markdown = 'A .b{Bold *Italic*} text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p>A <strong>Bold <em>Italic</em></strong> text</p>'
      );
    });

    test('Tx italic wraps markdown bold', async () => {
      const markdown = '.i{Italic **Bold**} text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p><em>Italic <strong>Bold</strong></em> text</p>'
      );
    });

    test('Tx italic wraps markdown bold - standalone', async () => {
      const markdown = '.i{**Bold**} text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p><em><strong>Bold</strong></em> text</p>'
      );
    });

    test('Tx italic wraps markdown bold - no text after', async () => {
      const markdown = '.i{**Bold**}';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p><em><strong>Bold</strong></em></p>'
      );
    });

    test('Tx italic wraps markdown bold with text', async () => {
      const markdown = '.i{**Bold** Text}';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p><em><strong>Bold</strong> Text</em></p>'
      );
    });

    test('Tx italic wraps markdown bold with prefix and suffix', async () => {
      const markdown =
        'An .i{Italic **Bold** kind of} text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p>An <em>Italic <strong>Bold</strong> kind of</em> text</p>'
      );
    });
  }); // Text with Tx-Markdown Mixed - Tx wraps Markdown

  describe('Text with Tx-Markdown Mixed - Markdown wraps Tx', () => {
    test('Markdown bold wraps tx italic', async () => {
      const markdown = '**Bold .i{Italic}** text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p><strong>Bold <em>Italic</em></strong> text</p>'
      );
    });

    test('Markdown italic wraps tx bold', async () => {
      const markdown = '*Italic .b{Bold} text*';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p><em>Italic <strong>Bold</strong> text</em></p>'
      );
    });

    test('Markdown bold wraps tx italic - with prefix', async () => {
      const markdown = 'A **Bold .i{Italic}** text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p>A <strong>Bold <em>Italic</em></strong> text</p>'
      );
    });

    test('Markdown italic wraps tx bold - with prefix', async () => {
      const markdown = 'An *Italic .b{Bold} text*';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p>An <em>Italic <strong>Bold</strong> text</em></p>'
      );
    });

    test('Markdown italic wraps tx bold - standalone', async () => {
      const markdown = '*Italic .b{Bold}*';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p><em>Italic <strong>Bold</strong></em></p>'
      );
    });

    test('Markdown italic wraps tx nested - quoted, bold, underline', async () => {
      const markdown =
        '*Italic .q{.b{Bold .u{Underline}}}* text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p><em>Italic <q><strong>Bold <u>Underline</u></strong></q></em> text</p>'
      );
    });

    test('Deep nesting - markdown wraps markdown wraps tx wraps tx wraps tx', async () => {
      const markdown =
        '_Italic **Very .q{.b{Bold .u{Underline}}}**_ text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p><em>Italic <strong>Very <q><strong>Bold <u>Underline</u></strong></q></strong></em> text</p>'
      );
    });
  }); // Text with Tx-Markdown Mixed - Markdown wraps Tx

  describe('Tx Edge Cases - Malformed Inline Tags', () => {
    test('Unclosed inline tag - ignored', async () => {
      const markdown = 'Text with .b{Bold tag';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<p>Text with .b{Bold tag</p>');
    });

    test('Empty inline tag - creates empty element', async () => {
      const markdown = 'Text with .b{} empty';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<p>Text with  empty</p>');
    });

    test('Inline tag without opening brace - ignored', async () => {
      const markdown = 'Text with .b Bold}';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<p>Text with .b Bold}</p>');
    });

    test('Inline tag without closing brace - ignored', async () => {
      const markdown = 'Text with .b{Bold';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<p>Text with .b{Bold</p>');
    });

    test('Just the tag name - ignored', async () => {
      const markdown = 'Text with .b alone';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<p>Text with .b alone</p>');
    });

    test('Nested unclosed tags - outer ignored, inner processes', async () => {
      const markdown = 'Text with .b{Bold .i{Italic} text';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p>Text with .b{Bold <em>Italic</em> text</p>'
      );
    });

    test('Escaped opening brace - treated as text', async () => {
      const markdown = 'Text with .b\\{Bold}';
      const html = await parseTxMarkdown(markdown);
      // Should not be processed as tag
      expect(html).toBe('<p>Text with .b{Bold}</p>');
    });

    test('Escaped closing brace - treated as text inside tag', async () => {
      const markdown = 'Text with .b{Bold \\} still bold}';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p>Text with <strong>Bold } still bold</strong></p>'
      );
    });

    test('Double escaped closing brace', async () => {
      const markdown = 'Text with .b{Bold \\\\} outside';
      const html = await parseTxMarkdown(markdown);
      // \\ becomes single backslash, } closes tag
      expect(html).toBe(
        '<p>Text with <strong>Bold \\</strong> outside</p>'
      );
    });
  }); // 'Tx Edge Cases - Malformed Inline Tags'

  describe('Tx Edge Cases - Unknown Tags', () => {
    test('Unknown inline tag - ignored', async () => {
      const markdown = 'Text with .unknown{content}';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p>Text with .unknown{content}</p>'
      );
    });

    test('Unknown heading tag - ignored', async () => {
      const markdown = '.hx Unknown Heading';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<p>.hx Unknown Heading</p>');
    });

    test('Tag with invalid characters - ignored', async () => {
      const markdown = 'Text with .b-old{content}';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<p>Text with .b-old{content}</p>');
    });

    test('Tag with numbers - ignored if not configured', async () => {
      const markdown = 'Text with .tag123{content}';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p>Text with .tag123{content}</p>'
      );
    });
  }); // 'Tx Edge Cases - Unknown Tags'

  describe('Tx Edge Cases - Spacing and Whitespace', () => {
    test('Tag with leading space - ignored', async () => {
      const markdown = 'Text with . b{Bold}';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<p>Text with . b{Bold}</p>');
    });

    test('Tag with space before opening brace - ignored', async () => {
      const markdown = 'Text with .b {Bold}';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<p>Text with .b {Bold}</p>');
    });

    test('Tag with newline in content - preserved', async () => {
      const markdown = 'Text with .b{Bold\ntext}';
      const html = await parseTxMarkdown(markdown);
      expect(html).toContain('<strong>');
      expect(html).toContain('Bold');
      expect(html).toContain('text');
    });

    test('Multiple spaces between tags', async () => {
      const markdown = '.b{Bold}    .i{Italic}';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p><strong>Bold</strong>    <em>Italic</em></p>'
      );
    });
  }); // 'Tx Edge Cases - Spacing and Whitespace'

  describe('Tx Edge Cases - Variant Syntax', () => {
    test('Variant without tag name - ignored', async () => {
      const markdown = 'Text with ..variant{content}';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p>Text with ..variant{content}</p>'
      );
    });

    test('Multiple dots in variant - only first treated as variant', async () => {
      const markdown = 'Text with .b.var.extra{content}';
      const html = await parseTxMarkdown(markdown);
      // Should parse as tag=b, variant=var, then .extra{ is ignored
      expect(html).toBe(
        '<p>Text with .b.var.extra{content}</p>'
      );
    });

    test('Variant without content - ignored', async () => {
      const markdown = 'Text with .b.variant';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe('<p>Text with .b.variant</p>');
    });
  }); //'Tx Edge Cases - Variant Syntax'

  describe('Tx Edge Cases - Nesting Edge Cases', () => {
    test('Same tag nested in itself', async () => {
      const markdown = '.b{Bold .b{nested bold}}';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p><strong>Bold <strong>nested bold</strong></strong></p>'
      );
    });

    test('Deeply nested same tags', async () => {
      const markdown = '.b{One .b{Two .b{Three}}}';
      const html = await parseTxMarkdown(markdown);
      expect(html).toBe(
        '<p><strong>One <strong>Two <strong>Three</strong></strong></strong></p>'
      );
    });

    test('Crossing nesting boundaries with markdown', async () => {
      const markdown =
        '.b{Bold **still .i{italic** and bold}}';
      const html = await parseTxMarkdown(markdown);
      // Markdown bold should close before italic in tx
      expect(html).toContain('<strong>');
      expect(html).toContain('<em>');
    });
  }); // 'Tx Edge Cases - Nesting Edge Cases'
});
