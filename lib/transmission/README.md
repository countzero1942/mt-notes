# Transmission

An extensible markdown extension system using elegant dot-tag syntax.

## Overview

Transmission extends markdown with a simple, unobtrusive syntax using "dot-tags" - tags that start with a period (`.`). Since natural prose rarely starts words with periods, this creates a clean extension point that doesn't interfere with normal writing.

## Syntax

### Three Tag Types

1. **Inline Tags**: `.tag{content}` or `.tag.variant{content}`
   ```
   This is .hl.g{highlighted in gold} text.
   ```

2. **Heading Tags**: `.tag Heading text`
   ```
   .h2 This is a Heading
   ```

3. **Block Tags**: `.tag:` followed by indented content
   ```
   .bq:
       This is a blockquote
       with multiple lines
   ```

### Features

- **Variants**: Use `.tag.variant` for styling variations
- **Nesting**: Tags can be nested recursively: `.hl.g{nested .b{bold} text}`
- **Attributes**: Use `%` prefix for parameters: `.tag %param: value %flag`
- **Poetic Lines**: Preserve indentation with proper CSS classes
- **Extensible**: Configure via TypeScript to map to markdown, HTML, or React components

## Installation

```bash
npm install transmission
```

## Usage

```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkTransmission } from 'transmission';
import { defaultTxConfig } from 'transmission/config';

const processor = unified()
  .use(remarkParse)
  .use(remarkTransmission, defaultTxConfig)
  .use(remarkRehype)
  .use(rehypeStringify);

const result = await processor.process('This is .hl.g{highlighted} text.');
console.log(String(result));
```

## Configuration

See `src/config.ts` for the default configuration. You can customize:

- **Inline tags**: Map to `<strong>`, `<em>`, `<mark>`, etc.
- **Heading tags**: Map to `<h1>` through `<h6>`
- **Block tags**: Map to lists, blockquotes, or custom HTML elements
- **Variants**: Define color schemes, styles, etc.
- **Attributes**: Define custom parameters for your tags

## Examples

### Inline Highlighting

```
This is .hl.g{important} and .hl.r{critical}.
```

### Lists with Headings

```
.ul This is my list:
    item 1
    item 2
    item 3
```

### Callouts

```
.co.warn:
    Warning: This is important!
```

### Details/Summary

```
.details: Click to expand
    Hidden content goes here
    across multiple lines
```

## Architecture

Transmission uses a **recursive descent parser** that:

1. Lets markdown parse normally (creating MDAST)
2. Post-processes the AST to find dot-tags
3. Recursively parses nested content
4. Transforms to target format (markdown nodes, HTML, or components)

This approach is simpler than micromark extensions and handles recursion naturally.

## Development

```bash
# Install dependencies
npm install

# Run tests (coming soon)
npm test
```

## License

MIT
