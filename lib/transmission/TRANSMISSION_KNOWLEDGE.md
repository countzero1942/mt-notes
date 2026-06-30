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
   - **component**: Block-only. Loads and hydrates a real framework component (React, Vue, Svelte, or Solid) as an island — NOT MDX; no JSX compiler or React dependency anywhere in the pipeline. See "Component Strategy (Islands)" section below.

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
   - Uses node position data to access original source text (the parsed AST text VALUE strips leading whitespace on continuation lines, so indentation must be read from raw source, not the AST)
   - Extracts indented blocks until dedent detected
   - TAB-ONLY: only leading tab characters count as indentation; leading spaces (e.g. a 4-space "soft tab") are NOT indentation and pass through as literal content (space-handling deferred, out of scope for now)

10. **Poetic Lines**
    - Implemented in `parsers/poetic.ts` via `parsePoeticBody()`, shared by BOTH plain markdown paragraphs that span multiple source lines AND block dot-tag bodies (`.bq:` etc.)
    - Two render modes via `TxConfig.poeticTextMode`: `"CssClassLines"` (default) — each line is its own `<p class="tx-line" style="--tx-indent: N">`, with the CSS variable set directly on every line (no separate `tx-indent-N` class); `"LineBreaks"` — the whole unit is one `<p>` with `<br>` between lines, indent rendered as `TxConfig.indentString` (default: 4 non-breaking spaces) repeated per level
    - `tx-last-line` class marks the final text line of a CssClassLines unit (restores normal paragraph bottom margin); a colon spacer line renders as `<p class="tx-line tx-space">`
    - An inline dot-tag whose braces span multiple lines (e.g. `.b{Bold` + newline + `text}`) is NOT treated as poetic — its content is preserved verbatim as one ordinary paragraph, since that's a different, pre-existing feature (newline-preserving inline content) that happens to share the same multi-line-paragraph signal

11. **Vertical Spacing Rules**
    - Single newline = poetic line (no vertical space)
    - Double newline = paragraph break (can only occur within a block dot-tag body — a blank line inside plain markdown always ends the paragraph node before poetic parsing ever sees it)
    - Colon-only line (`:`) = in-block vertical space that keeps the unit going (in an editor, `:` + enter preserves the block/indent, whereas enter-twice breaks out)
    - A poetic unit's first line must be at indent 0; later lines may be indented; multiple indent-0 lines may appear within one unit (each starts a new "sentence")
    - A single bare indent-0 line is just an ordinary `<p>`, not poetic

22. **Block Dot-Tag Processing**
    - Uses node position to access source lines
    - Tag regex matches only the FIRST line of the block tag (no end-of-string/multiline anchor) — markdown lazy-continuation merges a block's indented body into the same paragraph node as the `.tag:` line, so an end-anchored regex would never match a multi-line block
    - `getIndentedBlock()` extracts lines until dedent
    - `calculateNodesToReplace()` determines MDAST nodes consumed by indented content

## Implementation Details

12. **Codebase Structure** (`lib/transmission/`)
    - `types.ts`: TypeScript types
    - `config.ts`: default configuration + `mergeTxConfig()`
    - `tx-md-parser.ts`: `parseTxMarkdown(markdown, userConfig?)` — the assembled unified pipeline
    - `parsers/`: `inline.ts`, `inline-scanner.ts`, `block.ts`, `attributes.ts`, `poetic.ts`
    - `utils/`: `indent.ts`, `source.ts`, `nodes.ts`
    - `remark-transmission.ts`: main remark plugin
    - `rehype-transmission.ts`: rehype plugin
    - (in-file header comments still say "src/..." — a legacy label; the real path has no src/ prefix)

13. **Remark Plugin Processing**
    - **Phase 1**: Process block dot-tags
    - **Phase 2**: Process heading dot-tags; also detects poetic text in any plain multi-line paragraph and scans remaining paragraphs for inline dot-tags
    - **Phase 3**: Scan remaining container nodes (list items, blockquotes, transmission blocks) for inline dot-tags
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

## Component Strategy (Islands)

31. **What It Is**
    - Block-only strategy (`strategy: "component"`) for embedding real, interactive framework components — not MDX, no JSX compiler, no React dependency in the pipeline itself
    - Framework-agnostic: the SAME compiled tx-markdown output can hydrate on a React, Vue, Svelte, or Solid front end, since the embedding website controls how placeholders are hydrated, not Transmission
    - Inline islands are intentionally unsupported — a component needs a stable block-level place to mount
    - The goal: one `unified` pipeline compiles `.tx` markdown to HTML once, deployable on any website front end, with `.tsx`/`.vue`/etc. controls imported per-tag via `config.ts` and used directly in the markdown source as ordinary block dot-tags

32. **ComponentSpec**
    - `source`: import specifier, e.g. `"@/components/Chart"`
    - `export?`: named export, defaults to `"default"`
    - `framework?`: `"react" | "vue" | "svelte" | "solid"`, defaults to `"react"`
    - `hydrate?`: `"load" | "idle" | "visible" | "none"`, defaults to `"load"`
    - `contentProp?`: maps the block's indented body onto this named prop (as an array of lines) instead of rendering it as markdown children

33. **Current Output (Placeholder Seam)**
    - `createComponentBlock()` in `parsers/block.ts` emits a server-render placeholder `<div>` carrying the spec as data-tx-* attributes: `data-tx-component`, `data-tx-source`, `data-tx-framework`, `data-tx-hydrate`, `data-tx-props` (JSON-stringified props, including `%`-attributes and the `contentProp` body)
    - The actual SSR + hydration runtime (island manifest, per-framework adapters that read these attributes and mount the real component client-side) is NOT yet implemented — the placeholder is the stable seam it will plug into later
    - If `contentProp` is set, the block's children are NOT also rendered (the body is consumed entirely as that prop, not displayed as markdown content)

34. **Usage**
    - Configure once in `config.ts`: a block tag maps to `{ strategy: "component", component: {...} }`
    - Used directly in tx-markdown input as an ordinary block dot-tag, e.g. a `.chart:` block with an indented `%type: bar` attribute line and body content below it

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
    - Ensures class prefix consistency
    - Preserves ARIA attributes
    - (Indent styling for poetic lines is now set directly at node creation in `poetic.ts`, not via a separate rehype pass)

## Testing & Integration

28. **Testing**
    - Vitest test suite under `tests/lib/transmission/`, split by topic: `tx-basics.test.ts`, `tx-headings.test.ts`, `tx-poetic-text.test.ts`, `tx-latex.test.ts`
    - Verify markdown + tx → MDAST → HTML output directly via `parseTxMarkdown()`
    - `vite-tsconfig-paths` resolves the `@/` path alias in tests
    - Run via `npx tsc --noEmit` (typecheck) and `npx vitest run`

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

### Component Island
```
.chart:
\t%type: bar
\tJan: 100
\tFeb: 150
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

### Why Component Islands Aren't MDX
- No JSX compiler or React dependency in the pipeline itself
- A `ComponentSpec` just names an import + how to mount it; framework choice (React, Vue, Svelte, Solid) lives in `config.ts`, not in the markdown author's hands
- The SAME compiled tx-markdown output is meant to work on any website front end — the embedding site decides how to hydrate the placeholder islands

## Key Functions Reference

### Parsing Functions
- `parseInlineTransmission()`: Recursively parse inline dot-tags
- `extractBracedContent()`: Find matching closing braces
- `parseBlockAttributes()`: Extract block-level attributes
- `parseInlineAttributes()`: Extract inline attributes
- `parseBodyContent()`: Parse indented content as markdown (list bodies only)
- `parsePoeticBody()`: Parse indented/multi-line content into poetic-aware block content (everything else)

### Utility Functions
- `getIndentLevel()`: Calculate indentation from line (tab-only)
- `getIndentedBlock()`: Extract indented block from source
- `linesToText()`: Convert IndentedLine[] to text
- `calculateNodesToReplace()`: Determine consumed MDAST nodes

### Transformation Functions
- `createInlineNode()`: Create transmission inline node
- `createTransmissionBlock()`: Create transmission block node
- `createMarkdownBlock()`: Convert to markdown AST nodes
- `createHtmlBlock()`: Convert to HTML with attributes
- `createComponentBlock()`: Create a component island placeholder (data-tx-* attributes)

### Phase Functions
- `processBlockDotTags()`: Phase 1 - Process block tags
- `processHeadingDotTags()`: Phase 2 - Process heading tags, poetic text, and remaining inline tags
- `scanInlineTreeForDotTags()`: Phase 3 - Scan remaining container nodes for inline tags
- `unwrapFragments()`: Phase 4 - Unwrap multi-node insertions
