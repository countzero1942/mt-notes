# Transmission System Knowledge

This document contains comprehensive knowledge about the Transmission markdown extension system.

## Core Concepts

1. **What is Transmission?**
   - Transmission (abbreviated "tx") is a markdown extension system using dot-tags that start with periods
   - Designed to be unobtrusive since natural prose rarely starts words with periods

2. **Three Dot-Tag Types**
   - **Inline**: `.tag{content}` - Content wrapped in braces
   - **Heading**: `.tag Heading text` - Content follows tag
   - **Block**: `.tag:` followed by indented content

3. **Parsing Strategy**
   - Uses recursive descent parsing
   - Markdown parses first creating MDAST
   - Post-processes to find dot-tags
   - Recursively parses nested content
   - Transforms to target format

4. **Pipeline Architecture**
   ```
   Raw Markdown → remark-parse → MDAST → remark-transmission → 
   remark-rehype → HAST → rehype-transmission → HTML
   ```

5. **Variants and Recursion**
   - Variants use `.tag.variant` syntax (e.g., `.hl.g` for highlight gold)
   - Full recursion supported (e.g., `.hl.g{nested .b{bold} text}`)

## Attributes & Configuration

6. **Attribute Syntax**
   - Use `%` prefix
   - Boolean: `%flag`
   - Assignment: `%param: value`
   - Arrays: `%array: a | b | c`
   - Can be inline or block-level (indented lines starting with `%`)

7. **Output Strategies**
   - **markdown**: Converts to standard MDAST nodes (strong, emphasis, etc.)
   - **html**: Creates HTML elements with classes
   - **component**: For MDX/React components

8. **HeadingTarget Options**
   - `placeBefore`: Insert heading as paragraph before block
   - `summary`: For details/summary elements
   - `figcaption`: For figure elements
   - `title`: Heading inside block
   - `ignore`: Discard heading

21. **Attribute Parsing**
    - Inline: via regex from heading content
    - Block: from indented `%` lines
    - Arrays: support multi-line (double-indent) or pipe-delimited
    - Merged with block-level taking precedence

25. **TxConfig Usage**
    - `defaultTxConfig` provides base configuration
    - `mergeTxConfig()` merges user config with defaults
    - User tags override defaults while preserving unspecified defaults

27. **Variant System**
    - `className` can be string or function taking variant parameter
    - `variants` Record maps short codes to full names
    - Allows styling flexibility while keeping syntax concise

29. **Dot-Tag Naming**
    - Tag names and attributes can use any unicode except spaces and colon
    - Colon reserved for assignment
    - Keeps syntax flexible for international characters

## Indentation & Spacing

9. **Preserving Indentation**
   - Uses node position data to access original source text
   - Extracts indented blocks until dedent detected
   - Tabs and 4-space equivalents tracked

10. **Poetic Lines**
    - Use `tx-line` class to remove vertical spacing
    - CSS custom property `--tx-indent` for indentation
    - Applied as: `padding-left: calc(var(--tx-indent, 0) * 2em)`

11. **Vertical Spacing Rules**
    - Single newline = poetic line (no vertical space)
    - Double newline = paragraph break
    - Colon-only line (`:`) = empty line for spacing within indented blocks

22. **Block Dot-Tag Processing**
    - Uses node position to access source lines
    - `getIndentedBlock()` extracts lines until dedent
    - `calculateNodesToReplace()` determines MDAST nodes consumed by indented content

## Implementation Details

12. **Codebase Structure**
    - `src/types.ts`: TypeScript types
    - `src/parsers/`: inline, block, heading, attributes
    - `src/utils/`: indent, source, nodes
    - `src/remark-transmission.ts`: main plugin
    - `src/rehype-transmission.ts`: rehype plugin
    - `src/config.ts`: default configuration

13. **Remark Plugin Processing**
    - **Phase 1**: Process block dot-tags
    - **Phase 2**: Process heading dot-tags
    - **Phase 3**: Process inline dot-tags (recursive text node transformation)
    - **Phase 4**: Unwrap fragments for multi-node insertions

14. **Inline Dot-Tag Parsing**
    - Uses `extractBracedContent()` to find matching closing braces
    - Depth tracking for nested braces
    - Handles escaping with backslash
    - Recursively calls `parseInlineTransmission()` on content

17. **Why Recursive Descent?**
    - Simpler code than micromark extensions
    - Natural recursion handling
    - Easier debugging
    - Better for nested structures
    - Avoids complex state machines

18. **Mixing Markdown and Transmission**
    - Dot-tags can contain markdown syntax (`.hl.g{**bold** text}`)
    - Markdown can contain dot-tags
    - `parseMarkdownInline()` uses `fromMarkdown` to parse markdown within extracted content

19. **Custom MDAST Nodes**
    - `transmissionInline`: Inline dot-tags
    - `transmissionBlock`: Block dot-tags
    - `transmissionFragment`: Multi-node insertions
    - `poeticLine`: Lines with indentation
    - Nodes store `data.hName` and `data.hProperties` for HTML conversion in rehype phase

20. **Class Naming Convention**
    - `tx-` prefix (configurable)
    - Tag-based: `tx-highlight`
    - Variant-based: `tx-hl-g`
    - Semantic preservation
    - rehype plugin ensures consistent prefix application

23. **TransmissionFragment Node**
    - Used when `headingTarget='placeBefore'` requires inserting multiple nodes
    - Example: paragraph + list
    - `unwrapFragments()` phase replaces fragment with its children array

24. **List Creation**
    - `parseBodyContent()` converts indented lines to text
    - Parses as markdown
    - Wraps each block node as `listItem`
    - Creates list node with `ordered` flag from tag (`ol` vs `ul`)

30. **Processing Order**
    - CRITICAL: Block tags must be processed before heading/inline tags
    - Block tags consume following content
    - Heading tags processed before inline (prevent double-processing)
    - Fragments unwrapped last

## Default Configuration

15. **Default Transmission Tags**
    - `.b` → `<strong>`
    - `.i` → `<em>`
    - `.hl` → `<mark>`
    - `.ul` / `.ol` → lists
    - `.bq` → `<blockquote>`
    - `.h1` - `.h6` → headings
    - `.co` → callouts with variants (info, warn, err, tip)
    - `.details` → `<details>` / `<summary>`

## ARIA & Accessibility

16. **ARIA Support**
    - TxConfig supports `ariaRole` and `ariaLabel` properties
    - Can be static values or functions of variant
    - Applied in `data.hProperties` during MDAST transformation
    - Preserved through to final HTML

26. **Rehype-Transmission Plugin**
    - Handles `headingTarget` insertions (summary, figcaption, title elements)
    - Adds CSS custom properties for indents
    - Ensures class prefix consistency
    - Preserves ARIA attributes

## Testing & Integration

28. **Testing Plan**
    - Test Transmission in NextJS project
    - Verify markdown + tx → MDAST → HTML output on webpages
    - Use Windsurf Pro for unit testing implementation
    - Test various scenarios and edge cases

## Examples

### Inline Highlighting
```
This is .hl.g{important} and .hl.r{critical}.
```

### Lists with Headings
```
.ul This is my list:
\titem 1
\titem 2
\titem 3
```

### Nested Tags
```
.hl.g{This has .b{bold} inside}
```

### Callouts
```
.co.warn:
\tWarning: This is important!
```

### Details/Summary
```
.details: Click to expand
\tHidden content goes here
```

### Poetic Text with Indentation
```
To be or not to be
\tthat is the question
Whether 'tis nobler
\t\tin the mind
```

## Architecture Decisions

### Why Dot-Tags?
- Natural prose rarely starts words with periods
- Creates clean, unobtrusive syntax
- Easy to type and recognize
- Doesn't conflict with existing markdown

### Why Recursive Descent?
- Simpler than micromark state machines
- Natural handling of recursion
- Easier to debug and maintain
- Better suited for nested structures

### Why Three Tag Types?
- Covers all common use cases
- Clear semantic distinction
- Maps well to markdown/HTML structures
- Extensible for future needs

### Why Post-Process MDAST?
- Leverages existing markdown parser
- Allows mixing markdown and transmission
- Simpler than extending micromark
- Better error handling

## Key Functions Reference

### Parsing Functions
- `parseInlineTransmission()`: Recursively parse inline dot-tags
- `extractBracedContent()`: Find matching closing braces
- `parseBlockAttributes()`: Extract block-level attributes
- `parseInlineAttributes()`: Extract inline attributes
- `parseBodyContent()`: Parse indented content as markdown

### Utility Functions
- `getIndentLevel()`: Calculate indentation from line
- `getIndentedBlock()`: Extract indented block from source
- `linesToText()`: Convert IndentedLine[] to text
- `calculateNodesToReplace()`: Determine consumed MDAST nodes

### Transformation Functions
- `createInlineNode()`: Create transmission inline node
- `createTransmissionBlock()`: Create transmission block node
- `createMarkdownBlock()`: Convert to markdown AST nodes
- `createHtmlBlock()`: Convert to HTML with attributes

### Phase Functions
- `processBlockDotTags()`: Phase 1 - Process block tags
- `processHeadingDotTags()`: Phase 2 - Process heading tags
- `processInlineDotTags()`: Phase 3 - Process inline tags
- `unwrapFragments()`: Phase 4 - Unwrap multi-node insertions
