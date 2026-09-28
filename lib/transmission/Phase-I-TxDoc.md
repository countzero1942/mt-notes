# Phase I: TxDoc

**Transmission (Tx) — the Tx-markdown extension for `unified.js` pipelines**

*Revised 28 September 2026.* This document describes the target design of TxDoc and, where the implementation in `lib/transmission/` differs, says so. It is one of four TxPhase documents. §16 bridges to TxData and TxGen.

**Revision 28 September 2026.** TxAttributes on every TxElement, after its content, never in a Body Area (§6, §12). No spread operator; TxComponent props supplied either by named first-level TxAttributes or whole by `%props:` (§15.4). The fence name `tx-d` is settled. The VS Code extension — colouring, autocomplete, hover — is the editor target; the Obsidian plugin moves to a future version (§16.5, §16.6). TxComponent security is deferred (§15.8). Open-items registers gain a status column (§18).

**Status markers**

| Marker | Meaning |
|---|---|
| ✅ | Implemented and matches the target |
| ⚠️ | Implemented, but diverges from the target — listed in §17 |
| ❌ | Designed, not built |
| ❓ | Open — see §18 |

**Open-item status** — the Status column of every open-items register (§18 here; TxData §22; TxGen §20):

| Status | Meaning |
|---|---|
| ✅ | Resolved |
| 🟡 | Partially resolved — decided in principle, may need refinement |
| 🟠 | Unresolved |

Orange rather than red, because ❌ already means *not built*. Resolved items stay in the register as a record of the decision.

---

## Table of Contents

1. [The Four TxPhases](#1-the-four-txphases)
2. [Terminology](#2-terminology)
3. [What TxDoc Is](#3-what-txdoc-is)
4. [The Three Tx Signatures](#4-the-three-tx-signatures)
5. [Syntax Specification](#5-syntax-specification)
6. [The `%` Sigil Family](#6-the--sigil-family)
7. [Comments](#7-comments)
8. [Architecture](#8-architecture)
9. [Processing Phases](#9-processing-phases)
10. [TxConfig](#10-txconfig)
11. [Poetic Text](#11-poetic-text)
12. [TxAttributes](#12-txattributes)
13. [Structural Blocks: Grid](#13-structural-blocks-grid)
14. [Lists](#14-lists)
15. [TxComponents](#15-txcomponents)
16. [Bridge: TxData and TxGen](#16-bridge-txdata-and-txgen)
17. [Current State](#17-current-state)
18. [Open Items Register](#18-open-items-register)
19. [Hard-Won Learnings](#19-hard-won-learnings)

Appendices: A. Tx vs MDX · B. Default TxConfig · C. Worked Examples · D. Reference CSS

---

## 1. The Four TxPhases

| TxPhase | Scope |
|---|---|
| **TxDoc** (I) | The Tx-markdown integration in a `unified.js` pipeline. Dot-tags, poetic text, TxAttributes, TxComponents. File extension `.md`. |
| **TxData** (II) | Immutable, statically typed data built on traits. Types erase at compile; JavaScript arrow functions supply code. Lives in `tx-d` fences inside a TxDoc, or in a standalone `.txd` file. |
| **TxGen** (III) | Generation of a document tree into a static site: routes, slugs, link and image resolution, folder wrappers, the island build. |
| **TxCode** (IV) | A full trait-based language. Distant; not scoped here. |

TxDoc, TxData and TxGen together are what a working SSG documentation site needs. Each phase may defer parts to a later phase; those are recorded in §18.

---

## 2. Terminology

### 2.1 TxDoc terms

| Term | Meaning |
|---|---|
| **dot-tag** | The *form* of a Tx tag: a name beginning with a period — `.hl`, `.h2`, `.grid`. Shape, not function. |
| **TxElement** | Any of the three dot-tag constructs: TxInline, TxHeading, TxBlock. |
| **TxInline** | `.tag{Inner Content}` |
| **TxHeading** | `.tag Heading Content` |
| **TxBlock** | `.tag: Heading Area` with an indented Body Area, or `.tag` alone (void). |
| **TxVariant** | A second dot on a tag — `.hl.gld{…}`. Carries **appearance**. |
| **TxAttribute** | A `%`-prefixed key/value pair on a TxElement, placed after its content. Carries **structure and parameters**. Never in a Body Area. |
| **TxComponent** | A TxBlock mapped in `TxConfig.ts` to a UI component, rendered at build and hydrated in the browser. |
| **TxConfig** | The user-owned `TxConfig.ts`. There are no system dot-tags; everything is configurable. |
| **Inner Content** | Between a TxInline's braces. |
| **Heading Content** | After a TxHeading's dot-tag; or the text part of a TxBlock's Heading Area. |
| **Heading Area** | A TxBlock's first line after `.tag:`. Heading Content then TxAttributes. |
| **Body Area** | A TxBlock's indented lines. Body Content only — no TxAttributes. |
| **Tx-md pipeline** | remark-parse → remark-transmission → remark-rehype → rehype-transmission → stringify. All three Content kinds go through it. |
| **TxToken** | The lexical unit `%name`. Resolution decides whether it is a TxAttribute, a TxSetting or a TxKeyRef. |

### 2.2 Host-side terms

The word "framework" was doing two jobs. Split:

| Layer | Name | Examples |
|---|---|---|
| The component file mapped to a TxBlock | **TxComponent** | `Counter.tsx` |
| The library that renders and manages state | **UI framework** | React (Phase I target), Vue, Svelte, Solid |
| App frameworks that also build static output | **meta-framework** | Next.js, Astro, Nuxt, SvelteKit |
| Build-only static generators | **static site generator (SSG)** | Eleventy, Hugo, Docusaurus |
| Whatever project `TxConfig.ts` lives inside | **host project** | the `mt-notes` Next.js app |
| A live interactive region inside otherwise static HTML | **island** | a rendered TxComponent |

Consequence: `ComponentSpec.framework` is renamed **`ui`**, freeing "framework" for the host. ⚠️ (§17)

---

## 3. What TxDoc Is

TxDoc extends markdown with dot-tags so a plain `.md` file can carry semantic elements, styled spans, preserved indentation, layout and live components — while remaining readable as markdown and renderable in Obsidian.

**Design goals**

1. **Unobtrusive syntax.** Prose rarely starts a word with a period; `%name` is not something people type. Both stand out and are easy to match.
2. **Signature recognition.** Tx reads shape rather than reserving tokens: `.tag{` vs `.tag ` vs `.tag:`; `: ` (spaced, or colon at end of line) as assignment; `%` opening a key; strings never quoted.
3. **One compile pass.** Tx-md in, HTML plus island JavaScript out, at build time.
4. **Everything configurable.** `TxConfig.ts` is the user's file.
5. **Graceful degradation.** Anything unrecognised is emitted as written (§17.4).
6. **Framework-neutral.** Phase I targets React with Next.js and Astro as hosts, but nothing in the design is bound to them.

**What TxDoc is not.** Not a client-rendered app framework, not a database client. Documents are statically generated; dynamic behaviour lives inside TxComponents, which are ordinary UI-framework code outside the Tx domain.

---

## 4. The Three Tx Signatures

```
TxInline    .tag{Inner Content}                braces
TxHeading   .tag Heading Content               space
TxBlock     .tag: Heading Area                 colon, then indented Body Area
	Body Area
TxBlock     .tag                               void — no colon, alone in its paragraph
```

The character after the dot-tag name (or its variant) decides the structure.

**The colon means a value follows.** A colon with nothing after it — no Heading Content, no Body Area — is not valid. A TxBlock taking no attributes and no body is written **without** the colon:

```
Some text

.counter

More text
```

**A void TxBlock must be alone in its paragraph** — blank line after, or end of document. Otherwise markdown's lazy continuation merges the following prose into the same paragraph and the block would have to split a node. Text on the next line is therefore *not* a void block; the whole paragraph passes through as text.

**Lookup order for a bare `.name` line:** the heading table first, then the block table. A tag registered in both is unreachable in one, so `mergeTxConfig()` must error on a duplicate at config load. If the heading lookup fails and the block lookup succeeds but the line carries text or attributes (`.counter Some text %a: 3`), it is neither a TxHeading nor a void TxBlock — a clean diagnostic rather than a silent misparse. The fix is the colon: `.counter: %a: 3`.

**A void block with an indented body** (`.co` then indented lines) is a forgotten colon. Markdown turns the indented lines into a code block, so the author sees their content rendered as code. Emit a build warning.

**Naming.** Target: names may use `[\w-]+` — letters, digits, underscore, hyphen. Lowercase is the documented default; case is preserved and matching is case-sensitive. ⚠️ Current regex is `\w+` (no hyphen).

---

## 5. Syntax Specification

### 5.1 TxInline ✅ / attributes ❌

```
.tag{Inner Content}
.tag.variant{Inner Content}
.tag{Inner Content %attr: value %flag}
```

TxAttributes, if any, follow the Inner Content inside the braces (§12). Inner Content goes through the Tx-md pipeline; markdown and nested TxInlines to any depth. Braces match by depth. `\{`, `\}`, `\\` are literals. No whitespace between the dot-tag and `{`. `.b{}` collapses to nothing. Markdown may wrap a TxInline, and the scanner descends into `strong`, `emphasis`, `delete` (configurable via `scannableMdNodes`). Braces spanning a newline keep it verbatim; that is not poetic text.

### 5.2 TxHeading ✅ / attributes ❌

```
.tag Heading Content
.tag Heading Content %attr: value %flag
```

Everything after the first space is Heading Content, through the pipeline, up to the first TxAttribute. `.h3` alone is text. TxAttributes, if any, follow the Heading Content (§12).

### 5.3 TxBlock ✅ structure

```
.tag: Heading Content %attr: value %flag
	Body Area line
	Body Area line
```

- **Heading Area** (optional): Heading Content, then TxAttributes.
- **Body Area**: lines indented by at least one tab. Body Content only. A body line beginning with `%` is content, not a TxAttribute (the TxToken scan still applies to it).
- **Indentation is tab-only.** One tab per level. Leading spaces are content.
- The Body Area ends at the first non-blank line with less indentation than the first Body line.
- `headingTarget` (§10.4) decides where Heading Content goes.

### 5.4 Vertical spacing inside a Body Area ✅

| Line | Meaning |
|---|---|
| single newline | next poetic line, no vertical space |
| `:` alone on a line | vertical space within the same unit — the block continues |
| truly blank line | paragraph break within the Body Area |

The `:` spacer matters more than it looks. A blank line ends a paragraph, and Obsidian's reading-mode postprocessor is called **per section** — one top-level block — so a blank line inside a TxBlock splits it into two sections the plugin cannot reassociate. Use `:` for internal spacing.

### 5.5 Grammar summary

```
tx_inline    := '.' name ('.' variant)? '{' inner (' ' tx_attribute)* '}'
tx_heading   := '.' name ('.' variant)? ' ' heading_content (' ' tx_attribute)*
tx_block     := '.' name ('.' variant)? ':' heading_area? NEWLINE body_area
tx_void      := '.' name ('.' variant)? WS* (NEWLINE NEWLINE | EOF)
heading_area := heading_content? (' ' tx_attribute)*
body_area    := (TAB body_line NEWLINE)+
body_line    := TAB* content | ':' | ''
tx_attribute := '%' key | '%' key ': ' value
```

---

## 6. The `%` Sigil Family

One lexical form, three resolutions. Position and prefix decide which.

| Sigil | Name | Where | Meaning |
|---|---|---|---|
| `%name` | **TxAttribute** | after a TxElement's content: inside TxInline braces after Inner Content; after TxHeading Heading Content; in a TxBlock Heading Area after Heading Content. **Never in a Body Area.** | a parameter to the dot-tag |
| `%name` | **TxSetting** | anywhere in text inside a scoping block (placement open — §18 #43) | running state read in document order (list markers, §14) |
| `%.name` | **TxKeyRef** | anywhere in text | substitution of a TxData value (§16) |
| `%%` | comment | anywhere outside a fence | §7 |

Inside a `tx-d` fence, references use a bare `.` prefix instead of `%.` — there are too many of them for the longer form to be readable, and the fence gives unambiguous context.

**Why prefixes make the editor easy.** A dot-tag, a TxData reference and a TxAttribute each begin with a sigil that never starts a word in prose: nothing in normal text begins with `.` or `%`. So autocomplete fires only on `.` or `%` at the start of a token — after whitespace, line start, or an opening bracket — rather than on every keystroke as in languages whose names are bare words. See TxData §20.

**Why `%.` and not `%`.** In the Heading Area both attributes and value references appear on one line:

```
.desmos: %settings: %.graph1-settings %expressions: %.graph1-exprs
```

`.` is not a word character, so an attribute scanner can never swallow a keyref, and the two never collide. `%.` also retires the percent-encoding hazard: `search?q=a%20b` can never produce a TxToken.

**Resolution order in text:** TxKeyRef → TxSetting → leave as written (default error handling). Key attributes in a `tx-d` key head are positional and never collide with text tokens.

**Attribute values** may be a literal, a keyref (`%settings: %.key`), or a bracketed construction (`%settings: %.concat(a :: b)`). They may **not** be a bare attribute set — `%settings: %width: 500px %height: 400px` is ambiguous about where `settings` ends and is a compile error. Two `%name:` forms adjacent is the test. Brace- and paren-delimited values give the scanner an explicit end marker, so nesting inside those is fine.

⚠️ The current value pattern `([^%]+?)` stops at the next `%`, so an attribute whose value is a keyref fails to parse. Must admit a leading `%.`. (§17)

---

## 7. Comments

Obsidian uses `%%` for comments and strips them from reading view. Tx does the same, so a note renders identically in both.

**Two forms.**

*Inline* — a `%%…%%` pair within one line:

```
This is my %% inline comment %% text.
```

Yields text `This is my `, an inline comment node, text `text.`

*Block* — `%%` alone on a line opens, another closes; everything between is comment, across any number of blocks:

```
This is some text %% I begin the comment

A commented paragraph

Here I end the comment %% and this is visible.
```

The first paragraph keeps `This is some text` plus an inline comment. The middle paragraphs become block comments. The last paragraph keeps an inline comment plus `and this is visible.`

**Rules.**

- Comments are stripped in **Phase 0**, over raw source lines, before `remark-parse`. A `%%` spanning several blocks is invisible to a tree-walking plugin, so no transformer can do it.
- The scan is **fence-aware**: `%%` inside a fenced code block or inline code is literal text. Data blocks use `//`.
- Stripping must **preserve line count**. Comment lines are replaced with `indent + :` so `getIndentedBlock()` still indexes `sourceLines` correctly and a TxBlock body is not split.
- Ranges are recorded in `vfile.data.txComments` for editor colorization. Custom MDAST nodes are not used: a comment spanning partial paragraphs across block boundaries has no representable node type.
- An unterminated `%%` comments out the rest of the document, matching Obsidian and matching every language with block comments. A build warning is worth the trouble.
- ❓ Comments inside `.$` and `.$$` TxData string values are a later phase.

---

## 8. Architecture

### 8.1 Pipeline ✅

```
Tx-md source
	│
	▼
Phase 0                 strip %% comments; claim tx-d fences        ❌
	│
	▼
remark-parse            markdown → MDAST (dot-tags still plain text)
	│
	▼
remark-transmission     find dot-tags, read indentation from source, build custom nodes
	│
	▼
remark-math             optional
	│
	▼
remark-rehype           MDAST → HAST via data.hName / data.hProperties
	│
	▼
rehype-katex            optional
	│
	▼
rehype-transmission     headingTarget insertion, class-prefix pass
	│
	▼
rehype-stringify        HTML
```

`parseTxMarkdown(markdown, userConfig?)` assembles this.

### 8.2 Why post-process MDAST ✅

The standard parser does the heavy lifting; every node carries a `position`, so Tx can return to raw source for the indentation markdown discards; content inside a dot-tag is handed back to the same parser, giving recursion free. A micromark extension would be a state machine per construct — roughly an order of magnitude more code for this grammar.

The one thing post-processing cannot do is claim text *before* tokenization. That is why `tx-d` uses a **fenced code block**: remark hands over a `code` node with `lang` and raw `value`, blank lines preserved, untouched by every later phase — the custom node, for free.

### 8.3 Custom MDAST nodes ✅

| Node | Produced for | Rendered as |
|---|---|---|
| `transmissionInline` | TxInline with `html` strategy or unknown tag | element from `data.hName` |
| `transmissionBlock` | TxBlock with `html` or `component` strategy | element from `data.hName` |
| `transmissionFragment` | a TxBlock that becomes several siblings | unwrapped in Phase 4 |
| `poeticLine` | one line of a poetic unit | `<p class="tx-line" style="--tx-indent: N">` |

---

## 9. Processing Phases

`remarkTransmission` runs four phases in fixed order. ✅

**Phase 1 — TxBlocks.** Walk root-level paragraphs. Match `^\.(\w+)(?:\.(\w+))?:[ \t]*([^\n]*)` on the first text node — first line only, no end anchor (§19) — read the Body Area from raw source with `getIndentedBlock()`, build with `createTransmissionBlock()`, splice in place of every node the Body swallowed.

**Phase 2 — TxHeadings, poetic detection, inline scan.** Per paragraph: heading tag → convert; else multi-line and not in a list item → poetic unit; else scan for TxInlines.

**Phase 3 — Remaining containers.** Scan list items, blockquotes and `transmissionBlock` nodes for TxInlines.

**Phase 4 — Unwrap fragments.**

**Order matters.** TxBlocks consume following content, so they go first. TxHeadings before TxInlines so a heading line is not scanned twice. Fragments last.

**Inline scanning** (`scanInlineTreeForDotTags`) works on parsed MDAST with positions: find the first closable configured dot-tag in a text node, locate the matching `}` in raw source, gather every sibling whose position falls inside. It visits only `text` nodes; `inlineCode` is a leaf it never enters, and `processBlockDotTags` only looks at `paragraph` nodes, so **fenced code and inline code are structurally protected**. The same must hold for the TxToken scanner.

---

## 10. TxConfig

`TxConfig.ts` is a user file. Transmission ships `defaultTxConfig`; a project config is merged over it tag-by-tag. ⚠️ Currently named `config.ts`.

### 10.1 Shape ✅

```ts
interface TxConfig {
	inline:  Record<string, InlineTagConfig>;
	heading: Record<string, HeadingTagConfig>;
	block:   Record<string, BlockTagConfig>;

	classPrefix?: string;          // default "tx-"
	indentUnit?: string;           // default "2em"
	scannableMdNodes?: string[];   // default ["strong", "emphasis", "delete"]
	poeticTextMode?: "CssClassLines" | "LineBreaks";
	indentString?: string;
}
```

### 10.2 Output strategies

| Strategy | Available on | Produces |
|---|---|---|
| `markdown` | inline, heading, block | a standard MDAST node |
| `html` | inline, heading, block | element `htmlTag` with `className`, optional ARIA, variants |
| `component` | block only | a TxComponent island placeholder (§15) |
| `virtual` ❌ | block only | **no output** — parse-time state only (`.row`, §13) |

### 10.3 Body routing ❌

Body Content routing is currently: `mdType === "list"` → markdown, everything else → poetic. A third mode is needed:

```ts
bodyMode?: "poetic" | "markdown" | "blocks";
allowedChildren?: string[];
```

`blocks` means the Body Area is parsed as Tx-md and expected to contain child TxBlocks. `allowedChildren` makes a stray paragraph degrade visibly rather than silently.

**This does not work today.** `parseBodyContent()` calls bare `fromMarkdown(bodyText)`, which has no Tx extension — the comment claiming it "recursively handles transmission" is wrong, and nested dot-tags in a list body silently do nothing. `blocks` needs a helper that runs the whole transformer (parse, then `processBlockDotTags` + `processHeadingDotTags`) over the body as its own source. Fixing `parseBodyContent` at the same time gives list bodies nesting too.

Indentation is already correct for this: `getIndentedBlock()` strips the base indent and keeps deeper indents as relative levels, so a `.grid:` body arrives with `.row:` at 0 and `.cell:` at 1.

### 10.4 `headingTarget` ✅ config / ⚠️ effect

| Value | Heading Content becomes |
|---|---|
| `placeBefore` | a paragraph before the block (default for `ul`/`ol`) |
| `summary` | `<summary>` inside `<details>` |
| `figcaption` | `<figcaption>` inside `<figure>` |
| `title` | `<div class="tx-block-title">` as first child |
| `prop` ❌ | a TxComponent prop, named by `headingProp` (§15) |
| `ignore` | discarded (default for `bq`) |

### 10.5 Variants versus attributes

**Variants carry appearance; attributes carry structure.** `.grid.tight:` is a variant; `%size: C4xR3` is an attribute. The variant slot takes one value only (`.cell.2x2.center:` does not parse ❓) and is a lookup in a fixed map; attributes are open-ended and parsed.

---

## 11. Poetic Text

Markdown collapses single newlines and strips leading whitespace. TxDoc keeps both. ✅

**Poetic unit:** any run of lines separated by single newlines — a multi-line markdown paragraph, or a TxBlock Body Area. First line at indent 0; later lines may carry tabs; several indent-0 lines may occur in one unit.

**Tx-md documents are always word-wrap.** One source line is one logical line, always. This is why the indent tree in §13 and §14 is unambiguous.

*CssClassLines* (default) — every line its own paragraph carrying its indent as a CSS variable:

```html
<p class="tx-line" style="--tx-indent: 0">To be or not to be</p>
<p class="tx-line tx-last-line" style="--tx-indent: 1">that is the question</p>
```

*LineBreaks* — one `<p>` with `<br>` and `indentString` repeated per level.

⚠️ Poetic classes are hard-coded `tx-`; `classPrefix` is not applied.

---

## 12. TxAttributes

### 12.1 Syntax

One placement: **after the TxElement's content, on the same line.** ✅ decided / ❌ not built for TxInline and TxHeading.

```
.tag{Inner Content %attr: value}
.tag Heading Content %attr: value %flag
.my-block: Heading Content %attr: value %flag %list: abc :: def
	Body Content
```

- `%` opens a key. ` %` (with a preceding space) separates one attribute from the next.
- Strings are never quoted. A flag has the value `true`.
- **Array separator is ` :: `** (spaced double colon). `|` is the OR operator; `^` is XOR. ⚠️ Current code splits on `|`.
- **Never in a Body Area.** A Body Area holds Body Content only. A body line beginning with `%` is content. ⚠️ Current code parses Body attributes (D5).
- **Explicit only.** Every TxAttribute is written by the author. Nothing is inherited, implied or carried along.

### 12.2 Where they go

| Strategy | TxAttributes become |
|---|---|
| `markdown` | nothing |
| `html` | ⚠️ currently spread as raw HTML attributes; to be constrained |
| `component` | props (§15) |

### 12.3 Values

A value is a literal, a TxKeyRef (`%settings: %.my-settings`), or a bracketed construction (§6). In Phase I every literal is a string, `true`, or an array of strings. For a TxComponent the props trait types each first-level attribute (§15.4), so a literal is parsed against its field's type — the only typing a TxAttribute ever receives.

### 12.4 No attribute trees ✅

TxAttributes are one line and flat. Anything nested or long goes in a `tx-d` fence and arrives by reference. The Body-Area attribute tree this rules out:

```
.desmos:
	%settings:
		%height: 500px
		%width: 400px
	%expressions in %.DesmosExpr[]:
		%id: line1
		%latex: y = x^2
		:
		%id: line2
		%latex: y = 2x
```

would be a second typed-data grammar living inside Tx-md text — a second parser, a second set of diagnostics, a second set of editor rules. The same data in a fence:

````
.desmos: %props: %.desmos-props1

```tx-d
desmos-props1 in .DesmosProps:
	.settings:
		.height: 500px
		.width: 400px
	.expressions:
		.id: line1
		.latex: y = x^2
		:
		.id: line2
		.latex: y = 2x
```
````

There is then one place typed data is parsed. The attributes a TxElement actually needs are few, so the one-line limit costs little; the trade is recorded as §18 #42 in case a case turns up that it serves badly.

---

## 13. Structural Blocks: Grid ❌

The first dot-tag family that is purely structural — layout for what is inside, with no content of its own.

### 13.1 Syntax

```
.grid: %size: C4xR3
	.row:
		.cell: %span: R3xC2
			text
		.cell:
			text
		.cell:
			text
	.row:
		.cell: %span: C2
			text
	.row:
		.cell:
			text
		.cell:
			text
```

**Named axes.** `C4xR3` is four columns by three rows; `R3xC4` means the same thing. Order-free and self-documenting, which removes an entire class of bug.

```
axis-spec := axis-term ( "x" axis-term )?
axis-term := ( "R" | "C" ) integer
```

Regex `/^(?:([RC])(\d+))(?:x([RC])(\d+))?$/`, with validation that the two terms name different axes — `C4xC2` is an error, not last-wins. A missing axis is `1` in `%span` and unbounded in `%size`. `C4` is binding (the track definition needs it); `R3` is advisory (rows grow on overflow).

### 13.2 `.row` is a counter, not an element

`.row` uses `strategy: "virtual"` and produces no DOM. It maintains a cursor exactly as the HTML table algorithm does: a `<tr>` contains the cells that *start* in that row, not the cells that pass through it, and the browser skips occupied slots.

```
occupied = 2D boolean, cols wide
cursor_row = 0
for each .row:
	cursor_col = first unoccupied column in cursor_row
	for each .cell:
		place at (cursor_row, cursor_col)
		mark occupied for rowspan × colspan
		cursor_col = next unoccupied column in cursor_row
	cursor_row++
```

Authors already have intuitions for this from tables, and it means the author never writes a cell position.

`.grid:` may also contain `.cell:` directly, with no `.row:` — the cursor wraps at the column count. A short form for galleries where no spans are involved.

A void `.grid` is an error: the body is the whole point.

### 13.3 Output

```html
<div class="tx-grid" style="--tx-cols:4">
  <div class="tx-cell" style="--tx-c:1;--tx-cs:2;--tx-r:1;--tx-rs:3">…</div>
```

```css
.tx-grid { display: grid;
           grid-template-columns: repeat(var(--tx-cols,1), 1fr);
           grid-auto-rows: minmax(0, auto);
           gap: var(--tx-gap, 1rem); }
.tx-cell { grid-column: var(--tx-c) / span var(--tx-cs,1);
           grid-row:    var(--tx-r) / span var(--tx-rs,1); }

@media (max-width: 40rem) {
	.tx-grid { grid-template-columns: 1fr; }
	.tx-cell { grid-column: auto; grid-row: auto; }
}
```

Variables rather than a single `grid-area` shorthand: an inline `grid-area` would beat a media query and force `!important` for a mobile single-column override. With variables the class rule wins cleanly, which matters for Android reading.

---

## 14. Lists ❌

### 14.1 The unifying rule

Inside a list body, **every item line is a TxBlock heading for its own indented body** — content, then attributes, then children. The same ordering as a dot-tag, with the tag implied by a marker flag.

```
.ol: My ordered list %ol-I
	Item 1
	Item 2
	Item 3: %ul-C
		Note A
		Note B
	Item 4
```

A trailing colon on an item is ordinary prose punctuation — neither required nor stripped, so `Item 3:` and `Item 3` parse identically.

### 14.2 Marker flags (TxSettings)

| Flag | Element | `list-style-type` |
|---|---|---|
| `%ol-1` | `ol` | decimal |
| `%ol-A` / `%ol-a` | `ol` | upper-alpha / lower-alpha |
| `%ol-I` / `%ol-i` | `ol` | upper-roman / lower-roman |
| `%ul-D` / `%ul-C` / `%ul-S` | `ul` | disc / circle / square |
| `%ul-N` | `ul` | none |

Hyphenated names are unmistakable and cannot plausibly collide with a TxData key. Case is significant (`%ol-A` ≠ `%ol-a`) — worth remembering if TxData ever normalises identifiers. Style rides out as a class (`tx-list-circ`) via `data.hProperties`, not an inline style.

### 14.3 The nextType stack

A flag anywhere in an item's text sets the type of the **next** list created at that depth. Placement is free; convention is end-of-line before the indent.

```
descend into a nested list:   push a frame, initialised from the parent frame's current value
flag encountered at depth N:  mutate frame N only
ascend:                       pop; frame N-1 keeps what it had
```

So a flag affects the next list at its own depth and everything below, and changes made deeper never leak back up. The root frame is seeded by the dot-tag (`.ol` → `%ol-1`, `.ul` → `%ul-D`) and overridden by a flag in the Heading Area. Settings go out of scope at the end of the declaring block.

❓ `.ul:` with `%ol-I` is a contradiction — flag wins, or warn.

### 14.4 Parsing

Walk the indent tree from `getIndentedBlock()`. Per line: run the attribute parser, pull any marker out, leave the rest as attributes; content → `parseInlineTransmission`; children → nested list. **This replaces markdown body parsing for lists** — which simultaneously fixes the tab-indent-becomes-code-block problem and the nested-dot-tag bug, and it is the same indent-tree walk `bodyMode: "blocks"` needs.

Indent skips (0 → 2) are treated as the minimum next indent. A flag with no children is a no-op that still sets the running variable.

---

## 15. TxComponents

A TxComponent is a TxBlock mapped in `TxConfig.ts` to a component in the host project. The author writes an ordinary TxBlock; the build renders the component's HTML into the page and attaches the JavaScript that hydrates it.

### 15.1 Principles

- **Not MDX.** No JSX in the document, no JSX compiler in the pipeline, no React dependency inside Transmission.
- **Block-only.** An island needs a stable block-level mount point.
- **SSG.** Rendered at build, hydrated on the client. Tx fetches nothing at runtime.
- **Self-contained.** A TxComponent must not import server-side modules and must not rely on a context provider from the host's root layout. If it needs a provider, it wraps itself in one.
- **`TxConfig.ts` is the bridge**, living in the host project with access to every component and dependency.

### 15.2 CSR, SSR, SSG, and what hydration actually is

| | Who builds the HTML | When | Needs a server? |
|---|---|---|---|
| **CSR** | the browser, from JS | every page view | no, but the HTML arrives empty |
| **SSR** | a server process | every request | yes |
| **SSG** | the build | once | no — files on a CDN |

SSR and SSG run **identical code** — both call `renderToString`. The only difference is when.

**Hydration** is not the creation of JavaScript files. The build produces `<button>Clicked 0 times</button>` and writes it into the HTML. The browser shows it immediately, dead. Then the chunk loads, `hydrateRoot` runs, React executes `Counter()` in memory, compares to what is already on the page, and **adopts the existing button** — attaching the handler and wiring `useState`. If the markup does not match what the component would produce, React throws it away and re-renders: a hydration mismatch.

State lives in browser memory. Refresh resets it. That is the whole intended behaviour for counters, carousels and tab panels.

**"use client" does not mean client-side rendered.** It means the component may use state and effects and its code must ship to the browser. Client components are still rendered to HTML on the build machine. The cost is bundle size, not static generation.

**Islands.** A page is mostly dead HTML with a few live regions. Each island gets its own JavaScript; the prose gets none. A page with no TxComponents ships no React at all; a page with ten ships React once, shared.

**Components that cannot be pre-rendered.** A Desmos graph, a map, a canvas chart — anything whose work happens in `useEffect` — renders to an empty sized div at build. That is still worth doing: the height is right, so the page does not jump when the island appears. Such components are CSR islands inside an SSG page. ❓ Whether that is `render: "csr"` in the spec or just `hydrate: "none"` is open.

### 15.3 `ComponentSpec`

```ts
block: {
	desmos: {
		strategy: "component",
		component: {
			source: "@/components/DesmosGraph",   // or () => import(…)
			export: "default",
			ui: "react",                          // renamed from `framework` ⚠️
			hydrate: "visible",                   // "load" | "idle" | "visible" | "none"
			headingProp: "title",                 // optional: Heading Content → this prop  ❌
			contentProp: "expressions",           // optional: Body Content → this prop
			providers: [ … ],                     // ❌ see 15.7
			propType: "@/components/desmos.txd",  // ❌ the TxData props trait (location open, §18 #47)
		},
	},
},
```

`TxConfig.ts` holds only a **reference** to the component — its `.tsx` source or a built `.js` module (❓ not yet fixed). The component itself is TypeScript and lies entirely outside the Tx domain. The only thing Tx knows about it is its props, rewritten as a TxData trait.

### 15.4 Supplying props ✅ decided / ❌ not built

A React component's props are one data structure, but its **first-level properties** play the role attributes play on an HTML element: each is set by name. (They are never emitted as HTML attributes — non-standard attributes are invalid HTML and browsers warn about them.) Tx mirrors this: **first-level props are TxAttributes.**

Two forms, mutually exclusive:

```
.desmos: %settings: %.my-settings %expressions: %.my-expressions      named first-level props

.desmos: %props: %.my-props                                           the whole props structure
```

- **Named.** Each first-level prop is a TxAttribute set to a literal or a TxKeyRef. Only the props written are set; the component's own defaults supply the rest.
- **Whole.** `%props:` takes one TxKeyRef to a value of the component's props trait, and that value *is* the props object — nothing is merged into it. `%props` is a reserved TxAttribute name on `component` blocks, chosen because `props` is what React code already calls the whole structure.
- **Never both.** `%props` alongside any other TxAttribute is an error.
- **Void.** `.counter`, with no colon, sets nothing; the component's defaults apply.

````
Some text

.desmos: %settings: %.my-settings %expressions: %.my-expressions

```tx-d
my-settings in .DesmosSettings:
	...
my-expressions in .DesmosExpressions:
	...
```
````

````
Some text

.desmos: %props: %.my-props

```tx-d
my-props in .DesmosProps:
	.settings:
		...
	.expressions:
		...
```
````

The second is the simple way to hand a large settings tree to a component.

**No spread operator.** There is no `...` anywhere in Tx. One `%props:` reference is the whole props object, so the intent is plain without one. The job a spread usually does — shared defaults with per-use overrides — is multi-stage construction in TxData (TxData §8.6). The same easy-going rule replaces spread for 1-D arrays (TxData §8.5).

**Heading Content and Body Content.** When the ComponentSpec declares `headingProp` or `contentProp`, Heading Content or Body Content goes to that prop through the Tx-md pipeline (and is not also rendered as children). A component that declares neither ignores any content given to it — the author knows what a component takes. How content props combine with `%props:` is open (§18 #46).

**Props are typed in TxData.** The component's TypeScript props interface is rewritten as a TxData trait (`.DesmosProps`) named by `propType`. That trait types each named attribute, types the `%props:` value, and drives editor autocomplete and hover — `%` in a component's Heading Area offers the trait's first-level fields (TxData §20). Where props traits live is open (§18 #47).

**Reserved names.** `key`, `ref`, and `children` (unless it is the `contentProp`) belong to React and cannot be TxAttributes.

**Complex props belong in a `tx-d` fence** and arrive by reference. TxAttributes are one line and flat (§12.4). `tx-d` fences are page-scoped, so they can sit anywhere in the document, including at the end.

**What the component receives** is plain JavaScript data or JSON with every TxData type erased (TxData §17). The component sees no Tx machinery.

### 15.5 Current output — the placeholder seam ✅

```html
<div data-tx-component="desmos"
     data-tx-module="/_tx/desmos.js"
     data-tx-export="default"
     data-tx-hydrate="visible"
     data-tx-props-ref="tx-props-1"></div>
<script type="application/json" id="tx-props-1">{"expressions":[…]}</script>
```

**Props travel in a JSON script block, not an attribute.** LaTeX and similar payloads are full of backslashes, quotes and angle brackets; attribute-escaping a large JSON blob of that is bulky and a reliable source of bugs. A script block needs only `<` → `\u003c`. Next.js and Astro both use this pattern for their own serialized state. Use one mechanism, always the script block, so there is a single place props are written and read.

### 15.6 The build ❌

Once components are pre-built ES modules with React external, **the host framework stops being a participant.** Next.js and Astro then do two small jobs: run the pipeline, and write HTML to disk. Everything island-related is Tx's, identical across hosts.

```bash
esbuild src/Counter.tsx --bundle --format=esm \
  --external:react --external:react-dom/client \
  --metafile --outfile=_tx/counter.js
```

**Manifest.** Stable filename, hash as a field:

```json
{ "counter": {
    "source": "components/Counter.tsx",
    "module": "_tx/counter.js",
    "export": "default",
    "hash": "a3f9c1",
    "styles": "_tx/counter.css",
    "inputs": { "components/Counter.tsx": "sha256:9f2a…",
                "components/useTick.ts":   "sha256:c401…" }
} }
```

The hash in the manifest rather than the filename is what lets a user hand-place a module. Cache-busting still works: the site build emits `/_tx/counter.js?v=a3f9c1`.

`inputs` comes from esbuild's `metafile`, which reports every file that went into a bundle transitively — so editing an imported hook invalidates the bundle. Checking only the entry file's mtime would ship a stale component.

**Resolution order** for a `component` tag: manifest entry with module present (managed) → `_tx/<name>.js` exists (unmanaged, user-placed, never rebuilt or deleted by the build) → neither, render a visible notice. Never throw, never blank.

**`import "react"` resolution.** Each module still contains bare specifiers. On the website, an import map in the page head:

```html
<script type="importmap">
{"imports":{"react":"/_tx/react.js","react-dom/client":"/_tx/react.js"}}</script>
```

There must be exactly one React instance; two copies means broken hooks.

**CSS.** esbuild emits a component's CSS as a *separate* file. The manifest needs `styles`; the page links it once. Easy to forget, and the symptom is an island that works perfectly and looks wrong.

**Client runtime.** Scan `[data-tx-component]`, read `data-tx-hydrate`, schedule — `load` now, `idle` on `requestIdleCallback`, `visible` on `IntersectionObserver`, `none` never. Then:

```js
const mod = await import(el.dataset.txModule);
mountIsland(el, mod[el.dataset.txExport], props, mode);
```

Because the import is dynamic, **a page downloads modules only for islands it contains** — tree-shaking achieved structurally rather than by a bundler pass.

**One mount function, one switch:**

```ts
mode === "hydrate"
  ? hydrateRoot(el, createElement(Component, props))
  : createRoot(el).render(createElement(Component, props));
```

`hydrate` on the website, `csr` where there is no build-time render. Everything upstream is identical.

### 15.7 Providers

Each island is its own root, so React context does not cross between them — there is no "page root" to wrap once. But **the runtime owns every mount**, so wrapping happens there:

```ts
const tree = providers.reduceRight(
	(child, P) => createElement(P, null, child),
	createElement(Component, props),
);
```

Twelve islands means twelve provider instances. For theme providers that is cheap — a wrapper div with CSS variables.

Three tiers: the component wraps itself (simplest, most portable, start here); declared in the component's manifest entry; plugin- or site-global. Providers holding shared state (a query client, a store) take their instance from the runtime rather than constructing per island, or you get twelve independent stores.

**Better still, hoist the variables.** Most of what a theme provider does is emit CSS custom properties. Inject those once at `:root` and every island reads them through the cascade, whatever tree it lives in. Context is then only needed for genuinely behavioural things.

Mantine specifically: v7+ **does** need `MantineProvider` even with no theme, because the provider is what emits `--mantine-*`. Its modals and popovers portal to `document.body` by default; `withinPortal={false}` or a `portalProps.target` keeps them inside the island.

### 15.8 Security 🔮

**Deferred to a future public version.** For now the only TxComponents linked are the author's own, and the author is responsible for them. Security must be revisited before Tx is released for others' components; what follows is kept for that time.

**In the browser**, an island has exactly the powers any web page has — no filesystem, no Node, no server. A static site has no server process at all.

**At build time it is different.** `renderToString` runs on your machine, in Node, with your permissions. A component from a public repo is executed there. That reverses the intuition: the visitor is fairly safe and *you* are exposed, the same way an npm install script is. Mitigations: run the build-time render in a Worker sandbox, and read the source — a TxComponent is one small file, unlike a package with 400 transitive dependencies.

**CORS does not stop exfiltration.** CORS governs *reading responses*; it does not stop a request leaving. `fetch(url, {mode:"no-cors"})`, an image `src`, and `sendBeacon` all send data in the URL and do not care that the response is opaque.

**CSP does.** Emit it from the build:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; connect-src 'none'; img-src 'self' data:; frame-src 'none'">
```

`connect-src 'none'` kills fetch, XHR, WebSocket and `sendBeacon`; `img-src 'self' data:` closes the pixel channel. Inline scripts need a nonce under a strict policy, so the build emits one for the runtime. Make the policy configurable — a legitimate component might want one endpoint — and set it per route so a dashboard elsewhere in the app is unaffected.

### 15.9 Error handling

- **Per-island error boundary.** One thrown component currently takes the whole page render with it.
- **Missing module** → visible notice in place, naming the tag.
- **No-JS fallback** ❓ — Body Content is already in the source and could render inside the placeholder, replaced on hydration.

### 15.10 Order of work

1. Manifest + esbuild pass + client runtime, React only, Body Content via `contentProp`.
2. `headingProp` and named first-level TxAttributes.
3. `tx-d` props by reference, named and whole (`%props:`) (needs TxData).
4. Error boundaries. (CSP emission is deferred with §15.8.)
5. Other UI frameworks.

---

## 16. Bridge: TxData and TxGen

### 16.1 What TxDoc must ship for TxData to slot in

Three things, none deferrable:

1. **Fence claiming.** Phase 0 recognises ```` ```tx-d ```` blocks, captures the raw value, records the line range, removes them from the tree. It does not have to *parse* the contents.
2. **The TxToken scanner.** One pass over text nodes finding `%name` and `%.name`, leaving resolution to a pluggable resolver. TxDoc wires only the TxSetting resolver; TxData adds the TxKeyRef resolver behind it.
3. **Fixed lexical rules.** Assignment is `/:(?=\s|$)/`, first match only. Names are `[\w-]+`. Array separator ` :: `. `|` is OR, `^` is XOR, `%` opens keys, strings unquoted. These constrain TxDoc's own syntax, so they are fixed now.

### 16.2 TxData in one page

TxData is immutable, statically typed data built on **traits**. Everything is a trait. Types exist only in the compiler's map and **erase at compile** — the output is plain objects, primitives and arrays.

- **Multi-stage construction.** A trait accumulates fields across layers; when every required field is filled it becomes constructable. Nothing may reference a trait until then.
- **Declare once, define once.** A bare name declares (`x in .Z`); a dotted name defines or overrides (`.x: 42`). Two identical signatures in one trait is an error — a trait is a set.
- **Keywords.** `in` constrains to a closed type. `on` is single inheritance plus interfaces (base first). `add` is mix-in composition. `as` selects one arm of a type XOR set. `of` sets a default member type.
- **Containers.** `.T[]` array, `.T^{}` XOR set, `.T|{}` OR set. `%<` flattens.
- **Code.** `>>` separates typed Tx parameters from a JavaScript body. Parameters are bare identifiers; trait members are dot-referenced. Bodies are evaluated at build, in a sandbox with no I/O, no clock and no network, so builds are deterministic.
- **Numbers.** `.N .W .Z .Q .R`, with `.R:n` significant digits and `.R.n` decimal places, and interfaces `.IN .IW .IZ .IQ .IR`. Explicit types coerce downward; interfaces preserve the input type. Closure rules decide which operations a constrained output may use.
- **Conversions.** `to.$` string, `to.$$` Tx-md, `to.%` value, `from.*` inbound.

A data block is a **partial module trait**: a global head (a project `.txd` file) followed by one or more fences in the document, merged. A field may be declared in one fence and defined in a later one.

### 16.3 Props across the SSG boundary

Three different answers, because the target differs:

| Target | How props reach the component |
|---|---|
| Obsidian | the plugin holds the object in memory — `createRoot(el, …)`, no serialization |
| Website, build | the same object, in Node — `renderToString` |
| Website, browser | JSON script block; `JSON.parse` on hydration |

**TxKeyRefs resolve before serialization.** `latex: n = %.n` ships as `"n = 42"`. The browser receives plain data and needs no resolver, so **none of TxData's machinery exists in the client bundle.** Types are erased at the JSON boundary; checking happened at build.

Three declarations of one shape must agree — the TypeScript props interface, the Tx trait, and `TxConfig.ts`. Tx validates note values against the trait; nothing validates the trait against TypeScript. ❓ Generate one from the other, or accept the drift.

### 16.4 TxGen in one page

TxGen turns a document tree into a static site.

**Tree layout.** The vault lives anywhere — inside or outside the host project, and **not** in `public/`, since `public/` is copied verbatim and would serve raw markdown. Markdown is read at build by Node; only images need to be public.

**Slugs.** Files are sorted by **Dewey prefix** — a numeric prefix on the filename, sorted alphabetically, so inserting a chapter is a rename in Obsidian rather than an edit to an index. `01-01` before the hyphen is the part number. Sorting is explicit (never `readdir` order), by code units (never `localeCompare`, which varies by platform), with a warning on inconsistent prefix widths.

The prefix **stays in the slug**. That makes the slug a pure function of the file path — no cross-file lookup, no ordering dependency — which is what allows link rewriting without a resolution pass. `.title` affects display only. Hyphens throughout, lowercase.

**Traversal** is post-order depth-first: children render before their parent, so a folder wrapper receives fully processed children. Ancestor context passes down on the way in; child entries collect on the way out, so each document knows its folder and position.

**Links.** A directory scan builds a `name → paths[]` map (and a `filename → paths[]` map for images). Index each file under its full name, its prefix-stripped name, and its path; lowercase the key and keep the original in the value, since Obsidian resolves case-insensitively and Linux build servers do not. `length > 1` is the ambiguity warning. Obsidian itself disambiguates on write (`[[Me/Stuff/House|House]]`), so this is mostly a sanity check.

**Images.** Collect every reference during the render pass, slugify the filename, copy into a mirror tree under `public/` at the same relative path, and rewrite to an **absolute** URL — relative resolution breaks under a trailing-slash route. Hash sources into the manifest so unchanged files are skipped, delete stale copies, and warn on `_images` files never referenced (a dynamically built path is invisible to the scanner).

**Folder metadata.** `_meta.md` — a markdown file so Obsidian can edit it — containing a `tx-d` fence. `_`-prefixed files are excluded from routing; specific names are recognised by the walker. Text outside the fence is ignored.

````
```tx-d
.tx-folder as .TxBook:
	.content:
		This is the intro to my book.
```
````

The folder type maps to a wrapper component **in `TxConfig.ts`**, not in the manifest — notes declare intent, config binds it to code, so vaults stay portable. The wrapper receives an entry list:

```
^ITxFolder %<:
	content in .$$?
	to.$$

TxEntry:
	filename in .$      // raw, with prefix
	order in .$         // the prefix, for sorting
	part in .N?
	index in .N         // ordinal after the canonical sort
	title in .$
	slug in .$
	date in .Date?
	tx-meta in .TxMeta?
```

`index` gives continuous chapter numbering across parts with no wrapper computing it. A wrapper sorts however it likes — Dewey order, date, alphabetical.

**Document metadata** replaces YAML frontmatter, because TxData is typed. A global `.txd` head defines `TxMeta`; each document sets it in any fence. If `.title` is unset the filename is used, prefix stripped. Dates are ISO 8601 (`2026-09-25`). ❓ YAML frontmatter compatibility is a later phase.

**Reentrancy.** A `.$$` value goes through the Tx-md pipeline, which resolves against `TxConfig`. So a folder wrapper is an island born from metadata rather than from a `.md` file — the one place a component originates outside a document. `_meta.md` images still need collecting, and an island declared there attaches to the folder's index route.

**CLI.** `tx check` (parse, typecheck, print diagnostics), `tx data --out json`, `tx build`, `tx watch`. The compiler is a library; the CLI is a thin wrapper, because the VSCode extension, the Obsidian plugin and the Next.js build all need the same entry points.

### 16.5 Editor tooling: the VS Code extension

**The editor target is a VS Code extension giving colouring, autocomplete, and hover information over fields and trait types.** These are first-class, not deferred. The full design — trigger rules, completion contexts, hover content, parser layers — is in TxData §20, because nearly all of it concerns typed data.

What TxDoc contributes to the extension:

- **Dot-tag names** for `.` completion in Tx-md text, from the `TxConfig.ts` tag tables: at line start, TxHeading and TxBlock tags; mid-line, TxInline tags.
- **TxAttribute names** for `%` completion after a TxElement's content — for a TxComponent, the first-level fields of its props trait (§15.4).
- **TxSetting names** (list markers, §14.2) for `%` completion on list item lines.
- **Fence claiming and the TxToken scanner**, so the extension knows which regions are Tx-md text, which are `tx-d`, and where each `%.` reference sits.

Diagnostics still come from the parser, not the editor: every parse and resolve step returns `{line, col, message}` rather than throwing, and `tx check` is a command-line shell over the same library.

Using **acorn** for the `>>` rewriter (which is needed anyway for `.name` → `name()` and member chains) gives JavaScript syntax errors free.

### 16.6 Obsidian plugin (future version) 🔮

**Obsidian remains the authoring tool** for the vault — notes, wikilinks, Dewey-prefix renames. Without a plugin, dot-tags and `tx-d` fences simply show unprocessed in Obsidian, which is acceptable. `tx-d` fences are edited in VS Code with the Tx extension, and the rendered result is viewed by building the site or running it in dev. The plugin is the least important piece of work and moves to a future version. Notes kept for then:

Reading mode uses `registerMarkdownPostProcessor`, which fires **per section** — one top-level block. Obsidian's own renderer runs first and does not know Tx, so the postprocessor must recover raw source via `ctx.getSectionInfo(el)` and re-run it. Obsidian renders sections lazily and *unrenders* them when scrolled far away, so islands mount and unmount; keep a `Map<HTMLElement, Root>` and `unmount()` on teardown.

There is no build step in Obsidian, so nothing is hydrated — `createRoot` creates the DOM directly. That is CSR, and it is simpler than the website path.

Community-plugin constraints: no remote code execution, no obfuscated code, no `innerHTML`, network use disclosed. Executing code the *user* placed in their vault is established practice (Dataview, Templater); a plugin that *fetches* code from GitHub is not. So component repos are cloned by the user; the plugin only builds what is already there. Desktop is Electron with Node access, so `>>` evaluation belongs in a Worker regardless.

Mobile has no compiler. Built modules sync as ordinary vault files, so the phone imports what the desktop built. Only the build command is desktop-only.

---

## 17. Current State

### 17.1 Implemented ✅

TxInline (full), TxHeading (full), TxBlock structure and Body extraction, tab-only indentation, poetic text (both modes), TxVariants, `markdown`/`html` strategies, ARIA, `mergeTxConfig`, `placeBefore`, the TxComponent placeholder seam, error pass-through, KaTeX.

### 17.2 Divergences ⚠️

| # | Divergence | Fix |
|---|---|---|
| D1 | File is `config.ts` | rename to `TxConfig.ts` |
| D2 | Variant codes are single letters | three-letter codes (`gld`, `red`, `blu`…) |
| D3 | Names matched by `\w+` — no hyphen | widen to `[\w-]+` |
| D4 | Attribute arrays split on `\|` | switch to ` :: ` |
| D5 | Body Area TxAttributes are parsed, and override Heading | remove — TxAttributes come only after content; a Body Area is Body Content only (§12) |
| D6 | `attributes` schema coerces `number` | drop for Phase I, or mark as the TxData hook |
| D7 | `html` strategy spreads attributes as raw HTML attributes | constrain |
| D8 | Poetic classes ignore `classPrefix` | apply, or document `tx-` as fixed |
| D9 | `ComponentSpec.framework` | rename to `ui` |
| D10 | Attribute value pattern `([^%]+?)` rejects `%.keyref` values | admit a leading `%.` |
| D11 | `README.md`, `TRANSMISSION_REPORT.md`, `TRANSMISSION_KNOWLEDGE.md` stale | supersede and delete |

### 17.3 Suspected defects ❓

| # | Suspicion | Evidence |
|---|---|---|
| S1 | `rehype-transmission` is a no-op | keys on `element.data.txType`, which no remark code sets and `mdast-util-to-hast` does not copy. If confirmed, `summary`/`figcaption`/`title` never insert and `ensureClassPrefix` never runs. |
| S2 | `co` Heading Content is lost | no `headingTarget`; stored in `headingContent`, never rendered |
| S3 | `.h3:` fallthrough | becomes a generic `<div class="tx-h3">`; target is text |
| S4 | Nested dot-tags in a Body Area never parse | `parseBodyContent()` calls bare `fromMarkdown`; the comment claiming recursion is wrong |

### 17.4 Error handling ✅ (default) / ❌ (additions)

**Default rule: emit the text as written.** No exceptions, no placeholders. A typo shows up in the page where the author can see it.

| Input | Output |
|---|---|
| unknown tag `.unknown{x}` | as text |
| unclosed `.b{Bold` | as text |
| nested unclosed | outer text, inner renders |
| `.h3` with no content | `<p>.h3</p>` |
| `.b {x}`, `. b{x}`, `.b.var.extra{x}` | text |

Target additions: `.tag:` with no value → text; a `%` line in a Body Area → content, not an attribute; `%props` with any other TxAttribute → error; void block with an indented body → warning; `.grid` with no body → error.

### 17.5 Not built ❌

Phase 0 (comments, fence claiming), the TxToken scanner, `bodyMode: "blocks"`, grid, implicit lists, the island build (manifest, esbuild pass, runtime), `headingProp`, TxAttributes on TxHeadings and inside TxInline braces, `%props:`, error boundaries, CSP emission (🔮), TxBlock/attribute/component test files, the VS Code extension, all of TxGen.

### 17.6 Ordered to-do

1. TxBlock tests — will confirm or clear S1–S4.
2. Fix S1/S2 so `details`, `figure`, `title` work.
3. D1, D2, D9, D11.
4. Phase 0: comment stripping and `tx-d` fence claiming.
5. `bodyMode: "blocks"` + the recursive body parser; fix S4.
6. Grid; then implicit lists.
7. Island build: manifest → esbuild → runtime, React only, `contentProp` only.
8. D3, D4, D5, D10 (attributes), TxAttributes after content on every TxElement, and `%props:` — against the first real prop use case.
9. Diagnostics, then `tx check`, then the VS Code extension: TextMate grammar, then a language server with diagnostics, hover and completion (TxData §20).

---

## 18. Open Items Register

Status legend: ✅ resolved · 🟡 partially resolved · 🟠 unresolved (see the top of this document). Items that belong to TxData or TxGen are cross-referenced to their own registers.

| # | Item | Resolution | Status |
|---|---|---|---|
| 1 | Indent skip (0 → 2) | treat as minimum next indent | ✅ |
| 2 | List flag with no children | sets the running variable, no warning | ✅ |
| 3 | `%.` prefix vs TxData key collision | retired by `%.` and hyphenated flags | ✅ |
| 4 | `%%` escaping | structural — backticks protected by node type | ✅ |
| 5 | Mid-line TxToken | allowed; needs the end-of-line lookahead relaxed | ✅ |
| 6 | Multiple variants (`.cell.2x2.center:`) | single variant only today | 🟠 |
| 7 | Blank line inside a block body | ends it; `:` is the spacer; matters doubly in Obsidian | ✅ |
| 8 | Nested dot-tag in a body | broken (S4) — fix designed: `bodyMode: "blocks"` | 🟡 |
| 9 | Unknown flag | falls through as attribute | ✅ |
| 10 | `%20`-style URL collision | retired by `%.` | ✅ |
| 11 | List root-frame seed | dot-tag seeds; Heading flag overrides | ✅ |
| 12 | `.ul:` + `%ol-I` contradiction | flag wins, or warn | 🟠 |
| 13 | `.R:5` vs assignment colon | resolved by `: ` requiring a following space | ✅ |
| 14 | `<`/`>` suffix operators vs inline HTML | safe unless a letter follows `<` | ✅ |
| 15 | Line preservation when stripping | replace with `indent + :` | ✅ |
| 16 | `_meta.md` scope resolution | by line-range containment | ✅ |
| 17 | TxKeyRef cycles | retired by declaration order | ✅ |
| 18 | Attribute value must admit `%.` | required, now load-bearing for both props forms (§15.4); code fix is D10 | 🟡 |
| 19 | Attribute scanner brace/paren depth | already depth-aware; nesting kept | ✅ |
| 20 | `.$` / `.$$` substitution rules | `.$` substitutes keyrefs only; `.$$` also runs dot-tags | ✅ |
| 21 | Member shadowing a page-level key | warn | ✅ |
| 22 | `.tag:`-with-nothing asymmetry | retired — void blocks drop the colon | ✅ |
| 23 | Comma grouping vs array delimiter | use `_` (`9_007_199_254_740_991`) | ✅ |
| 24 | Unterminated `%%` | comments to end of document; warn | ✅ |
| 25 | `#` vs `:#` constant markers | see TxData §22 #5 | 🟠 |
| 26 | Validators at compile vs runtime | compile-time via closure rules; computed values open (TxData §22 #20) | 🟡 |
| 27 | Interval expressions in type position | see TxData §22 #16 | 🟠 |
| 28 | Nested TxComponents inside `.grid` cells | allowed once `bodyMode: "blocks"` lands; what `contentProp` then carries is undecided | 🟠 |
| 29 | `render: "csr"` as a spec field vs `hydrate: "none"` | undecided | 🟠 |
| 30 | Shared-data deduplication across islands | a page-level JSON block referenced by key | 🟠 |
| 31 | No-JS fallback via Body Content | undecided | 🟠 |
| 32 | Tx trait vs TypeScript props drift | props are rewritten as a TxData trait; nothing checks it against the TypeScript interface (TxData §22 #27) | 🟠 |
| 33 | `tx-d` vs `tx-data` fence name | **`tx-d`** | ✅ |
| 34 | Slug collision when parts are omitted from filenames | see TxGen §20 #1 | 🟠 |
| 35 | Part as a URL segment | see TxGen §20 #2 | 🟠 |
| 36 | Structural identity vs nominal unions | assignment structural, `as` nominal | ✅ |
| 37 | Projection (`vf in .VecFields: .v`) implicit or marked | see TxData §22 #15 | 🟠 |
| 38 | Default type from first *assigned* vs first *declared* field | see TxData §22 #22 | 🟠 |
| 39 | Hash-cons key: (type, values) or (values) | see TxData §22 #23 | 🟠 |
| 40 | `to.X` namespace: reserved for type conversions? | see TxData §22 #21 | 🟠 |
| 41 | Function overloads, generics | 🔮 deferred to a later phase | 🟠 |
| 42 | TxAttributes: after content on every TxElement, never in a Body Area, no attribute trees (§12) | adopted; kept open in case a case turns up that the one-line limit serves badly | 🟡 |
| 43 | TxSetting placement | anywhere in a line today; may be restricted to the end of the line, the same form as TxAttributes | 🟠 |
| 44 | TxBlock Heading Content and Body Content per tag: required, optional or none | content a tag does not take is ignored; whether tags declare it (and warn) is undecided | 🟡 |
| 45 | Whole-props form `%props: %.ref` (§15.4) | explicit reserved name, mutually exclusive with named attributes; consequence: a component whose own first-level prop is named `props` cannot set it by name | 🟡 |
| 46 | `headingProp` / `contentProp` together with `%props:` | allowed or error; if allowed, which wins when content targets a prop the `%props:` value also sets | 🟠 |
| 47 | Where TxComponent props traits live | in the TxDoc global head, or in `.txd` files that the global head imports (needs a `.txd` import mechanism); either way they join global scope, and a name defined twice is an error | 🟠 |
| 48 | React-reserved names as TxAttributes | `key`, `ref`, and `children` (unless it is the `contentProp`) rejected; every TxAttribute is explicit | ✅ |
| 49 | Spread operator | none; a single `%props:` reference and 1-D array flattening by rank (TxData §8.5) replace it | ✅ |
| 50 | TxComponent security: build-time sandbox, CSP emission (§15.8) | 🔮 deferred to a future public version; only the author's own components are linked for now | 🟠 |
| 51 | Obsidian plugin | future version; Obsidian stays the authoring tool, VS Code the Tx editor (§16.6) | ✅ |
| 52 | How the editor reads tag names from `TxConfig.ts` without executing component code | static read with the TypeScript compiler API, or a manifest written by `tx check` (TxData §22 #40) | 🟠 |
| 53 | ComponentSpec reference: `.tsx` source or built `.js` module | not yet fixed | 🟠 |

---

## 19. Hard-Won Learnings

1. **Lazy continuation merges the Body Area into the `.tag:` paragraph.** The block regex must match the *first line only* — no `$`, no multiline flag — or multi-line blocks never match.
2. **AST text values strip continuation indentation.** Read indentation from raw source via `position`, never from the AST.
3. **Tab-only indentation.** A 4-space soft tab is content. Editors converting tabs to spaces silently break TxBlocks.
4. **`getIndentedBlock()` strips only the base indent.** Deeper indents are kept as relative levels; blank and `:` lines are recorded with their marker.
5. **List bodies parse as markdown; everything else as poetic.** Routing is by `mdType === "list"`.
6. **Inline scanning must be position-aware**, so `.b{Bold *It*}` can absorb the already-parsed `emphasis` node.
7. **`{}` inside math.** KaTeX runs after Tx. The `\.(\w+)\{` opener requirement is what keeps LaTeX safe. Keep it.
8. **`node.position` is the "came from source" signal.** Synthesised nodes have none, and several phases rely on that.
9. **Error handling is pass-through, deliberately.**
10. **A blank line is a section boundary in Obsidian**, not just a paragraph break. The `:` spacer is what keeps a TxBlock in one section.
11. **Fenced code is structurally safe.** The scanners visit only `text` and `paragraph` nodes, so `code` and `inlineCode` can never be corrupted — which is why `tx-d` is a fence.
12. **`%` is ASCII punctuation, so CommonMark eats `\%`.** Escaping cannot rely on backslash in Heading Content; backticks work because of node type, not because of escaping.
13. **`Number.EPSILON` is a base-2 quantity.** `2 × Number.EPSILON` scaled by decade is what actually matches 15 reliable decimal digits (see `utils/math.ts`).
14. **`toFixed` rounds the binary value, not the decimal.** `(1.005).toFixed(2)` is `"1.00"` because the stored double is below 1.005. Decimal-intent rounding needs a relative-epsilon nudge.
15. **Documentation drifts fast.** Keep this document the single source.

---

## Appendix A — Tx vs MDX

| | MDX | Tx (TxDoc) |
|---|---|---|
| Document syntax | markdown with JSX and imports | markdown with dot-tags |
| Human readability | JSX tag soup in prose | dot-tags read as light markup; the file stays `.md` |
| Toolchain | JSX compiler, React at build and often runtime | `unified` pipeline only |
| Component framework | React | React first; Vue/Svelte/Solid admissible |
| Where components are declared | in each document | once, in `TxConfig.ts` |
| Obsidian | broken | renders as markdown; dot-tags visible as text at worst |
| Static output | React tree hydrated whole | static HTML with islands hydrated per directive |
| Extensibility | write a component | add a dot-tag to config |

## Appendix B — Default TxConfig

`.b .i .s .code` (markdown) · `.hl .u .sup .sub .kbd .q .cite .abbr .dfn .data .time .mark` (html) inline; `.h1`–`.h6` heading; `.bq .ul .ol` (markdown) · `.details .figure .aside .co` (html) block. Full listing in `config.ts`; target variant codes per D2.

## Appendix C — Worked Examples

**TxInline with variant and nesting**

```
This is .hl.gld{important .b{and bold}} text.
```
```html
<p>This is <mark class="tx-highlight tx-hl-gld">important <strong>and bold</strong></mark> text.</p>
```

**TxBlock — callout with poetic Body Area**

```
.co.warn:
	Back up first.
	:
	Then run the migration
		on a copy.
```
```html
<aside class="tx-callout tx-callout-warn" role="note" aria-label="Warning">
<p class="tx-line" style="--tx-indent: 0">Back up first.</p>
<p class="tx-line tx-space" style="--tx-indent: 0"></p>
<p class="tx-line" style="--tx-indent: 0">Then run the migration</p>
<p class="tx-line tx-last-line" style="--tx-indent: 1">on a copy.</p>
</aside>
```

**Void TxComponent**

```
Some text

.counter

More text
```

**TxComponent with data**

````
The number is %.n

.desmos: %props: %.graph1-props

```tx-d
n: 42
graph1-props in .DesmosProps:
	.settings:
		.xAxisStep: 1.5708
	.expressions:
		.id: n
		.latex: n = %.n
		:
		.id: line1
		.latex: y = sin(x)
```
````

**Grid**

```
.grid: %size: C4xR3
	.row:
		.cell: %span: R3xC2
			Left panel
		.cell:
			A
		.cell:
			B
```

## Appendix D — Reference CSS

```css
.tx-line      { margin: 0; padding-left: calc(var(--tx-indent, 0) * 2em); }
.tx-last-line { margin-bottom: 1em; }
.tx-space     { height: 1em; }

.tx-grid { display: grid;
           grid-template-columns: repeat(var(--tx-cols,1), 1fr);
           grid-auto-rows: minmax(0, auto);
           gap: var(--tx-gap, 1rem); }
.tx-cell { grid-column: var(--tx-c) / span var(--tx-cs,1);
           grid-row:    var(--tx-r) / span var(--tx-rs,1); }
```

> **Fence convention.** CommonMark requires a closing fence at least as long as its opening fence, so a four-backtick fence may contain any three-backtick fence. Examples showing a `tx-d` block are therefore wrapped in four backticks. Content inside a fence is never indented for the fence's sake — it is preserved byte for byte, and the opening-fence stripping rule counts spaces only, so Tx's tabs always survive intact.
