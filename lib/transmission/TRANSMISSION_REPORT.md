# Transmission: A Technical Deep Dive

**An Extensible Markdown Extension System Using Dot-Tag Syntax**

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Introduction](#introduction)
3. [The Problem](#the-problem)
4. [The Solution: Dot-Tag Syntax](#the-solution-dot-tag-syntax)
5. [Syntax Specification](#syntax-specification)
6. [Architecture Overview](#architecture-overview)
7. [Processing Pipeline](#processing-pipeline)
8. [Implementation Details](#implementation-details)
9. [Configuration System](#configuration-system)
10. [Advanced Features](#advanced-features)
11. [Use Cases](#use-cases)
12. [Design Decisions](#design-decisions)
13. [Future Directions](#future-directions)

---

## Executive Summary

**Transmission** is a markdown extension system that introduces "dot-tags" - a clean, unobtrusive syntax for extending markdown without interfering with natural prose. By using tags that start with a period (`.`), Transmission provides a powerful, type-safe way to add custom formatting, semantic elements, and interactive components to markdown documents.

**Key Features:**
- **Unobtrusive syntax** that doesn't conflict with natural writing
- **Three tag types** for different content structures (inline, heading, block)
- **Full recursion support** for nested tags
- **Flexible output** (markdown, HTML, or React components)
- **Type-safe configuration** via TypeScript
- **ARIA-compliant** HTML output
- **Preserves indentation** for poetic text and code

---

## Introduction

Markdown has become the de facto standard for writing technical documentation, blog posts, and notes. However, standard markdown has limitations:

- Limited semantic elements (no callouts, details/summary, etc.)
- No native support for custom styling
- Awkward syntax for nested structures
- No way to preserve indentation for poetry or specialized formatting

Many solutions exist (MDX, custom HTML, preprocessors), but they each have drawbacks:
- **MDX** requires React knowledge and build tooling
- **Raw HTML** breaks markdown's simplicity
- **Preprocessors** add complexity and aren't portable

**Transmission solves these problems** by introducing a simple, elegant syntax that extends markdown without breaking it.

---

## The Problem

Consider these common scenarios where standard markdown falls short:

### Scenario 1: Highlighted Text with Variants
**What you want:**
> This is <mark style="background: gold">important</mark> and this is <mark style="background: red">critical</mark>.

**Standard markdown:**
```markdown
This is <mark style="background: gold">important</mark> and 
this is <mark style="background: red">critical</mark>.
```

**Problem:** Raw HTML is verbose and breaks markdown's clean syntax.

### Scenario 2: Lists with Headings
**What you want:**
```
Here's my shopping list:
- Apples
- Bananas
- Oranges
```

**Standard markdown:**
```markdown
Here's my shopping list:

- Apples
- Bananas
- Oranges
```

**Problem:** Forced blank line breaks text flow; heading isn't semantically connected to list.

### Scenario 3: Poetic Text with Indentation
**What you want:**
```
To be or not to be
    that is the question
Whether 'tis nobler in the mind
    to suffer the slings and arrows
```

**Standard markdown:**
```markdown
To be or not to be<br>
&nbsp;&nbsp;&nbsp;&nbsp;that is the question<br>
Whether 'tis nobler in the mind<br>
&nbsp;&nbsp;&nbsp;&nbsp;to suffer the slings and arrows
```

**Problem:** Requires manual `<br>` tags and non-breaking spaces; indentation lost.

---

## The Solution: Dot-Tag Syntax

Transmission introduces **dot-tags** - tags that start with a period (`.`). Since natural prose rarely starts words with periods, this creates a clean extension point.

### Why Periods?

Consider these observations:
- English sentences don't start with periods
- Code identifiers rarely start with periods
- Periods are easy to type (no shift key)
- Periods are visually distinct but not intrusive

**Result:** A syntax that's both powerful and invisible when you're not using it.

### The Three Tag Types

Transmission provides three tag types to cover all common use cases:

#### 1. Inline Tags
**Syntax:** `.tag{content}` or `.tag.variant{content}`

**Example:**
```markdown
This is .hl.g{highlighted in gold} text.
```

**Output:**
```html
This is <mark class="tx-highlight tx-hl-g">highlighted in gold</mark> text.
```

#### 2. Heading Tags
**Syntax:** `.tag Heading content`

**Example:**
```markdown
.h2 Chapter One: The Beginning
```

**Output:**
```html
<h2>Chapter One: The Beginning</h2>
```

#### 3. Block Tags
**Syntax:** `.tag:` followed by indented content

**Example:**
```markdown
.bq:
    To be or not to be,
    that is the question.
```

**Output:**
```html
<blockquote>
    <p>To be or not to be,
    that is the question.</p>
</blockquote>
```

---

## Syntax Specification

### Inline Dot-Tags

**Grammar:**
```
inline_tag := '.' tag_name ('.' variant)? '{' content '}'
tag_name   := [a-zA-Z0-9_]+
variant    := [a-zA-Z0-9_]+
content    := (text | inline_tag | markdown)*
```

**Features:**
- Supports variants for styling (`.hl.g` = highlight gold)
- Fully recursive (`.hl.g{nested .b{bold} text}`)
- Mixes with markdown (`.hl{**bold** text}`)
- Brace matching with escape support (`\{` for literal brace)

**Examples:**
```markdown
Simple: .b{bold text}
Variant: .hl.r{red highlight}
Nested: .hl.g{outer .b{bold} text}
Mixed: .hl{**markdown** works too}
Escaped: .code{function() \{ return; \}}
```

### Heading Dot-Tags

**Grammar:**
```
heading_tag := '.' tag_name ' ' heading_content
heading_content := (text | inline_tag | markdown)*
```

**Examples:**
```markdown
.h1 Main Title
.h2 Subtitle with .hl{highlighting}
.h3 Chapter **Three**
```

### Block Dot-Tags

**Grammar:**
```
block_tag := '.' tag_name ('.' variant)? ':' (' ' heading_content)? '\n' indented_content
indented_content := (indented_line | empty_line)*
indented_line := INDENT content '\n'
empty_line := ':' '\n'
```

**Features:**
- Indentation defines block scope
- Dedent ends the block
- Heading content optional (on same line as tag)
- Colon-only lines (`:`) create vertical spacing
- Supports attributes via `%` prefix

**Examples:**

Simple block:
```markdown
.bq:
    This is a quote.
    Multiple lines work.
```

With heading:
```markdown
.ul Here's my list:
    Item 1
    Item 2
    Item 3
```

With vertical spacing:
```markdown
.bq:
    First paragraph.
    :
    Second paragraph after spacing.
```

With attributes:
```markdown
.co.warn:
    %title: Important Warning
    %icon: exclamation
    Please read this carefully!
```

---

## Architecture Overview

Transmission uses a **four-layer architecture**:

```
┌─────────────────────────────────────────┐
│         Raw Markdown + Transmission      │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│      remark-parse (Standard Parser)      │
│         Creates MDAST (Markdown AST)     │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│     remark-transmission (Transform)      │
│  • Finds dot-tags in MDAST               │
│  • Recursively parses content            │
│  • Creates custom nodes                  │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│    remark-rehype (MDAST → HAST)          │
│         Converts to HTML AST             │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│   rehype-transmission (HTML Transform)   │
│  • Handles heading placement             │
│  • Adds CSS variables                    │
│  • Ensures class prefixes                │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│          HTML String Output              │
└─────────────────────────────────────────┘
```

### Why This Architecture?

1. **Leverages existing tools** - Uses battle-tested markdown parser
2. **Post-processing is simpler** - Easier than extending the parser
3. **Natural recursion** - Can call markdown parser on nested content
4. **Flexible output** - Can target markdown, HTML, or components

---

## Processing Pipeline

### Phase 1: Standard Markdown Parsing

Input:
```markdown
This is .hl.g{highlighted} text.

.ul My list:
    item 1
    item 2
```

After `remark-parse`:
```javascript
{
  type: 'root',
  children: [
    {
      type: 'paragraph',
      children: [
        { type: 'text', value: 'This is .hl.g{highlighted} text.' }
      ]
    },
    {
      type: 'paragraph',
      children: [
        { type: 'text', value: '.ul My list:' }
      ]
    },
    {
      type: 'paragraph',
      children: [
        { type: 'text', value: 'item 1' }
      ]
    },
    // ... more paragraphs
  ]
}
```

**Note:** At this stage, Transmission syntax is just text. Indentation has been interpreted as separate paragraphs.

### Phase 2: Block Dot-Tag Processing

The plugin detects `.ul My list:` and:
1. Uses position data to find source line
2. Looks at following lines in original source
3. Detects indentation
4. Extracts indented block
5. Calculates which MDAST nodes to consume

```javascript
// Detect pattern
if (text.match(/^\.(\w+)(?:\.(\w+))?:\s*(.*)$/)) {
  // Get source lines
  const { indentedLines } = getIndentedBlock(source, lineNumber);
  
  // Create transmission block
  const txNode = createTransmissionBlock(tag, variant, heading, indentedLines);
  
  // Replace consumed nodes
  children.splice(index, nodesToReplace, txNode);
}
```

Result:
```javascript
{
  type: 'transmissionFragment',
  children: [
    {
      type: 'paragraph',
      children: [{ type: 'text', value: 'My list:' }]
    },
    {
      type: 'list',
      ordered: false,
      children: [
        { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'item 1' }] }] },
        { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'item 2' }] }] }
      ]
    }
  ]
}
```

### Phase 3: Inline Dot-Tag Processing

For each text node:
1. Search for `.tag{` pattern
2. Find matching closing brace (depth tracking)
3. Extract content
4. Recursively parse content
5. Create transmission node
6. Replace text node

```javascript
function parseInlineTransmission(text) {
  const nodes = [];
  const regex = /\.(\w+)(?:\.(\w+))?\{/g;
  
  for (const match of text.matchAll(regex)) {
    // Find closing brace
    const { content, endPos } = extractBracedContent(text, match.index);
    
    // Recursive call!
    const children = parseInlineTransmission(content);
    
    // Create node
    nodes.push(createInlineNode(tag, variant, children));
  }
  
  return nodes;
}
```

Result:
```javascript
{
  type: 'paragraph',
  children: [
    { type: 'text', value: 'This is ' },
    {
      type: 'transmissionInline',
      tag: 'hl',
      variant: 'g',
      children: [
        { type: 'text', value: 'highlighted' }
      ],
      data: {
        hName: 'mark',
        hProperties: { className: 'tx-highlight tx-hl-g' }
      }
    },
    { type: 'text', value: ' text.' }
  ]
}
```

### Phase 4: Fragment Unwrapping

TransmissionFragment nodes (used for multi-node insertions like "paragraph before list") are unwrapped:

```javascript
visit(tree, 'transmissionFragment', (node, index, parent) => {
  parent.children.splice(index, 1, ...node.children);
});
```

### Phase 5: MDAST → HAST Conversion

Standard `remark-rehype` converts markdown nodes to HTML nodes. Custom nodes use `data.hName` and `data.hProperties`:

```javascript
{
  type: 'transmissionInline',
  data: {
    hName: 'mark',  // Becomes <mark>
    hProperties: { className: 'tx-highlight tx-hl-g' }
  }
}
// Becomes:
{
  type: 'element',
  tagName: 'mark',
  properties: { className: ['tx-highlight', 'tx-hl-g'] }
}
```

### Phase 6: Rehype Processing

The `rehype-transmission` plugin:
- Handles heading placement (summary, figcaption, etc.)
- Adds CSS custom properties for indentation
- Ensures class prefix consistency

Final HTML:
```html
<p>This is <mark class="tx-highlight tx-hl-g">highlighted</mark> text.</p>

<p>My list:</p>
<ul>
  <li>item 1</li>
  <li>item 2</li>
</ul>
```

---

## Implementation Details

### Recursive Descent Parsing

Transmission uses **recursive descent** - a classic parsing technique where each grammar rule becomes a function.

**Example: Parsing Inline Tags**

```typescript
function parseInlineTransmission(text: string): Node[] {
  const nodes: Node[] = [];
  let pos = 0;
  
  while (pos < text.length) {
    // Try to match dot-tag
    const match = text.slice(pos).match(/^\.(\w+)(?:\.(\w+))?\{/);
    
    if (match) {
      const { content, endPos } = extractBracedContent(text, pos + match[0].length);
      
      // RECURSION: Parse content inside braces
      const children = parseInlineTransmission(content);
      
      nodes.push(createNode(match[1], match[2], children));
      pos = endPos + 1;
    } else {
      // Not a tag, consume text
      const textEnd = text.indexOf('.', pos + 1);
      nodes.push({ type: 'text', value: text.slice(pos, textEnd) });
      pos = textEnd;
    }
  }
  
  return nodes;
}
```

**Why Recursive Descent?**
- **Natural recursion** - Just call the function again
- **Easy to debug** - Can add logging at each level
- **Flexible** - Easy to add special cases
- **Proven** - Used by most compilers

**Alternative (Rejected): Micromark Extensions**
- Requires complex state machines
- Hard to debug
- Difficult to handle deep nesting
- More code for same functionality

### Brace Matching Algorithm

Finding the matching closing brace is critical for inline tags:

```typescript
function extractBracedContent(text: string, start: number) {
  let depth = 1;  // Already inside opening brace
  let pos = start;
  let escaped = false;
  
  while (pos < text.length && depth > 0) {
    if (escaped) {
      escaped = false;
      pos++;
      continue;
    }
    
    const char = text[pos];
    
    if (char === '\\') {
      escaped = true;
    } else if (char === '{') {
      depth++;  // Nested opening brace
    } else if (char === '}') {
      depth--;  // Found closing brace
      if (depth === 0) {
        return { content: text.slice(start, pos), endPos: pos };
      }
    }
    
    pos++;
  }
  
  return { content: '', endPos: -1 };  // Malformed
}
```

**Test Cases:**
```typescript
extractBracedContent('hello}', 0)           // → 'hello'
extractBracedContent('a {nested} b}', 0)    // → 'a {nested} b'
extractBracedContent('escaped \\} still}', 0) // → 'escaped \\} still'
```

### Indentation Tracking

Block tags need to preserve indentation from the source:

```typescript
function getIndentedBlock(lines: string[], startLine: number) {
  const result: IndentedLine[] = [];
  let baseIndent: number | null = null;
  
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    const indent = getIndentLevel(line);
    
    // First line sets base
    if (baseIndent === null) {
      baseIndent = indent;
      if (indent === 0) break;  // No indentation = end
    }
    
    // Dedent = end of block
    if (indent < baseIndent) break;
    
    result.push({
      content: removeIndent(line, baseIndent),
      indent: indent - baseIndent,  // Relative indent
      isVerticalSpace: line.trim() === '' || line.trim() === ':'
    });
  }
  
  return result;
}
```

**Example:**
```
Input:
.bq:
    First line
        Nested indent
    Back to base
Regular text

Result:
[
  { content: 'First line', indent: 0 },
  { content: 'Nested indent', indent: 1 },
  { content: 'Back to base', indent: 0 }
]
// Stops at "Regular text" (dedent)
```

### Mixing Markdown and Transmission

Content can contain both markdown and transmission syntax:

```markdown
.hl.g{This has **markdown** and .b{nested tx}}
```

**Processing:**
1. Extract: `"This has **markdown** and .b{nested tx}"`
2. Recursively parse transmission: Find `.b{nested tx}`
3. Parse markdown: Convert `**markdown**` to `<strong>`
4. Combine results

```typescript
function parseContent(content: string): Node[] {
  // First pass: Extract transmission tags
  const txNodes = parseInlineTransmission(content);
  
  // Second pass: Parse markdown in text nodes
  return txNodes.flatMap(node => {
    if (node.type === 'text') {
      return parseMarkdownInline(node.value);
    }
    
    // Recurse into transmission nodes
    if (node.type === 'transmissionInline') {
      node.children = parseContent(node.children);
    }
    
    return node;
  });
}
```

---

## Configuration System

### The TxConfig Object

Configuration uses a strongly-typed TypeScript object:

```typescript
interface TxConfig {
  inline: Record<string, InlineTagConfig>;
  heading: Record<string, HeadingTagConfig>;
  block: Record<string, BlockTagConfig>;
  classPrefix?: string;
  indentUnit?: string;
}
```

### Three Output Strategies

Tags can output in three different formats:

#### 1. Markdown Strategy
Converts to standard markdown AST nodes:

```typescript
{
  'b': {
    strategy: 'markdown',
    mdType: 'strong'  // .b{text} → <strong>text</strong>
  }
}
```

**Use when:** You want semantic HTML without custom classes.

#### 2. HTML Strategy
Creates HTML elements with classes:

```typescript
{
  'hl': {
    strategy: 'html',
    htmlTag: 'mark',
    className: (variant) => `tx-highlight tx-hl-${variant}`
  }
}
```

**Use when:** You need custom styling via CSS.

#### 3. Component Strategy
Creates MDX/React components:

```typescript
{
  'Chart': {
    strategy: 'component',
    component: 'Chart',
    attributes: {
      type: { type: 'string', required: true },
      data: { type: 'array', required: true }
    }
  }
}
```

**Use when:** You need interactive components.

### Variant System

Variants provide styling variations without new tags:

```typescript
{
  'hl': {
    variants: {
      'g': 'gold',
      'r': 'red',
      'b': 'blue'
    },
    className: (v) => v ? `tx-hl-${v}` : 'tx-highlight'
  }
}
```

Usage:
```markdown
.hl.g{gold highlight}
.hl.r{red highlight}
.hl{default highlight}
```

### Heading Target System

Block tags can place their heading content in different locations:

```typescript
{
  'details': {
    headingTarget: 'summary'  // Heading → <summary>
  },
  'figure': {
    headingTarget: 'figcaption'  // Heading → <figcaption>
  },
  'ul': {
    headingTarget: 'placeBefore'  // Heading → paragraph before list
  }
}
```

Example:
```markdown
.details: Click to expand
    Hidden content
```

Output:
```html
<details>
  <summary>Click to expand</summary>
  <p>Hidden content</p>
</details>
```

### Default Configuration

Transmission provides sensible defaults:

```typescript
const defaultTxConfig = {
  inline: {
    'b': { strategy: 'markdown', mdType: 'strong' },
    'i': { strategy: 'markdown', mdType: 'emphasis' },
    'hl': {
      strategy: 'html',
      htmlTag: 'mark',
      variants: { 'g': 'gold', 'r': 'red', 'b': 'blue' }
    }
  },
  block: {
    'ul': { strategy: 'markdown', mdType: 'list', headingTarget: 'placeBefore' },
    'bq': { strategy: 'markdown', mdType: 'blockquote' },
    'co': {
      strategy: 'html',
      htmlTag: 'aside',
      ariaRole: 'note',
      variants: { 'info': 'information', 'warn': 'warning' }
    }
  }
};
```

---

## Advanced Features

### Attribute System

Attributes use `%` prefix:

**Boolean flags:**
```markdown
.co: %collapsible
    Content
```

**Value assignment:**
```markdown
.alert: %title: Warning %level: 2
    Alert content
```

**Arrays:**
```markdown
.select: %options: red | blue | green
    Choose a color
```

**Multi-line arrays:**
```markdown
.chart:
    %data:
        Jan: 100
        Feb: 150
        Mar: 200
    Chart content
```

**Parsing:**
```typescript
function parseInlineAttributes(content: string) {
  const attrs = {};
  const regex = /%(\w+)(?::\s*([^%]+?))?(?=\s*%|\s*$)/g;
  
  for (const match of content.matchAll(regex)) {
    const [, name, value] = match;
    
    if (!value) {
      attrs[name] = true;  // Boolean
    } else if (value.includes('|')) {
      attrs[name] = value.split('|').map(v => v.trim());  // Array
    } else {
      attrs[name] = value.trim();  // String
    }
  }
  
  return attrs;
}
```

### ARIA Compliance

Transmission supports ARIA attributes for accessibility:

```typescript
{
  'co': {
    ariaRole: 'note',
    ariaLabel: (variant) => {
      const labels = {
        'info': 'Information',
        'warn': 'Warning',
        'err': 'Error'
      };
      return labels[variant] || 'Note';
    }
  }
}
```

Output:
```html
<aside class="tx-callout-warn" role="note" aria-label="Warning">
  Warning content
</aside>
```

### Poetic Text Preservation

Traditional markdown loses indentation:
```markdown
To be or not to be
    that is the question
```

Becomes:
```html
<p>To be or not to be
that is the question</p>
```

**Transmission preserves it:**

Uses CSS custom properties:
```html
<p class="tx-line" style="--tx-indent: 0">To be or not to be</p>
<p class="tx-line" style="--tx-indent: 1">that is the question</p>
```

With CSS:
```css
.tx-line {
  margin: 0;
  padding-left: calc(var(--tx-indent, 0) * 2em);
}
```

### Multi-Node Insertion

Some operations need to insert multiple nodes:

```markdown
.ul My list:
    Item 1
    Item 2
```

Should produce:
```html
<p>My list:</p>
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
```

**Solution: TransmissionFragment**

```typescript
// Create fragment
{
  type: 'transmissionFragment',
  children: [
    { type: 'paragraph', children: [...] },
    { type: 'list', children: [...] }
  ]
}

// Later, unwrap it
function unwrapFragments(tree) {
  visit(tree, 'transmissionFragment', (node, index, parent) => {
    parent.children.splice(index, 1, ...node.children);
  });
}
```

---

## Use Cases

### 1. Technical Documentation

**Callouts for different message types:**

```markdown
.co.info:
    This is informational content.

.co.warn:
    Be careful with this operation.

.co.err:
    This will cause data loss!
```

**Code with highlighting:**

```markdown
The function .code{useState} is a React hook.
```

### 2. Blog Posts

**Highlighted quotes:**

```markdown
As Einstein said, .hl.g{imagination is more important than knowledge}.
```

**Details/summary for long content:**

```markdown
.details: Click to read full bio
    Jane Doe is a software engineer...
    [long biography]
```

### 3. Poetry and Creative Writing

**Preserve indentation:**

```markdown
.poem:
    Roses are red
        Violets are blue
    Sugar is sweet
        And so are you
```

### 4. Educational Content

**Interactive exercises:**

```markdown
.exercise:
    %difficulty: medium
    %points: 10
    Calculate the derivative of x² + 2x + 1
```

### 5. Note-Taking

**Organized lists:**

```markdown
.ul Meeting Notes - Jan 15:
    Discussed Q1 goals
    Review budget
    Plan team offsite

.ul Action Items:
    .b{John}: Send proposal by Friday
    .b{Sarah}: Review contracts
```

---

## Design Decisions

### Why Not Use Existing Solutions?

**MDX:**
- ✅ Powerful, component-based
- ❌ Requires React knowledge
- ❌ Heavy build tooling
- ❌ Not portable to other systems

**Custom HTML:**
- ✅ Maximum flexibility
- ❌ Verbose syntax
- ❌ Breaks markdown's simplicity
- ❌ Hard to maintain

**Shortcodes (Jekyll, Hugo):**
- ✅ Simple syntax
- ❌ Platform-specific
- ❌ Not portable
- ❌ Limited nesting

**Transmission:**
- ✅ Clean, minimal syntax
- ✅ Framework-agnostic
- ✅ Fully recursive
- ✅ Type-safe configuration
- ✅ Works with existing markdown

### Why Recursive Descent Over Micromark?

**Micromark Extensions:**
```typescript
// State machine approach
function tokenize(effects, ok, nok) {
  return start;
  
  function start(code) {
    if (code === codes.dot) {
      effects.consume(code);
      return tagName;
    }
    return nok(code);
  }
  
  function tagName(code) {
    // 50+ more lines of state transitions...
  }
}
```

**Recursive Descent:**
```typescript
// Simple function calls
function parse(text) {
  const match = text.match(/^\.(\w+)\{/);
  if (match) {
    const content = extractContent(text);
    const children = parse(content);  // Recursion!
    return createNode(match[1], children);
  }
}
```

**Decision:** Recursive descent is 10x simpler for our use case.

### Why Three Tag Types?

**Inline** - For formatting within text:
- Most common use case
- Clear syntax with braces
- Natural for nested content

**Heading** - For titles and labels:
- Simpler than inline (no braces)
- Visual distinction from inline
- Maps to markdown headings

**Block** - For structured content:
- Handles complex nesting
- Preserves indentation
- Supports attributes

**Alternative considered:** Single tag type with auto-detection
- ❌ Ambiguous parsing
- ❌ Harder to read
- ❌ More error-prone

### Why Post-Process MDAST?

**Alternative 1:** Pre-process markdown text
- ❌ Loses position information
- ❌ Can't leverage markdown parser
- ❌ More complex string manipulation

**Alternative 2:** Custom markdown parser
- ❌ Huge implementation effort
- ❌ Compatibility issues
- ❌ Maintenance burden

**Chosen approach:** Post-process MDAST
- ✅ Leverages existing parser
- ✅ Access to position data
- ✅ Can recursively parse content
- ✅ Simpler implementation

---

## Future Directions

### 1. IDE Support

**Syntax highlighting** for dot-tags in VSCode, Obsidian, etc.

**Auto-completion** for tag names and variants.

**Live preview** showing rendered output.

### 2. Advanced Transformations

**Auto-linking** for references:
```markdown
See .ref{RFC-2616} for details.
```

**Automatic glossary**:
```markdown
.term{HTTP} is a protocol...
```

### 3. Component Library

**Pre-built components** for common patterns:
- Tabs
- Accordions
- Cards
- Timelines

### 4. CLI Tool

```bash
tx compile input.md -o output.html
tx watch src/ -o dist/
tx validate *.md
```

### 5. Integration Plugins

- **Obsidian plugin** for live rendering
- **VSCode extension** for syntax support
- **Eleventy plugin** for static sites
- **Astro integration** for content collections

---

## Conclusion

Transmission provides a clean, powerful way to extend markdown without sacrificing its simplicity. By using dot-tags - a syntax that doesn't conflict with natural prose - Transmission enables:

- **Rich formatting** with variants and nesting
- **Semantic HTML** with ARIA compliance
- **Flexible output** (markdown, HTML, or components)
- **Type-safe configuration** via TypeScript
- **Natural integration** with existing markdown tools

The recursive descent implementation makes the system simple to understand, debug, and extend. Whether you're writing technical documentation, blog posts, poetry, or notes, Transmission gives you the expressiveness you need while maintaining markdown's elegant simplicity.

**Get started today:**
```bash
npm install transmission
```

**Learn more:**
- [GitHub Repository](#)
- [Documentation](#)
- [Examples](#)

---

*Transmission: Extend markdown, elegantly.*
