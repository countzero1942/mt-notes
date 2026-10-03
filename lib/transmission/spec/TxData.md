# TxData

**Transmission (Tx) — immutable, statically typed data for TxDocs**

*Drafted 27 September 2026; revised 3 October 2026.* This document specifies TxData, one of the specs that make up the Spec (TxDoc §1). Nothing in it is implemented yet; every section is a target. §22 records what is open.

**Revision 28 September 2026.** Fence name settled as `tx-d`. 1-D arrays accept members, array references, and both mixed; rank decides flattening and there is no spread operator (§8.5, §8.6). Imported JavaScript functions (§16.6). §20 becomes *Diagnostics and Editor Tooling*: the VS Code extension with colouring, `.`/`%`-triggered autocomplete and hover is first-class; the Obsidian plugin is a future version. The open-items register gains a status column (§22).

**Revision 29 September 2026.** The TxFolder union as the worked example of a type-discriminated union (§11.5, same example as TxGen §8). Global heads are base layers, with one top-level override per file (§3.2). Two global heads: `TxData-Head.txd` and `TxFolder-Head.txd` (§3.3). Module settings (§3.5). Key Area and Value Area (§7.1). Interface members are required by ordinary declaration (§10.2). String, enum and key/value XOR sets (§11.2). Only `.to.$` is inherent; `to.%` is removed (§14.1). Erasure emits no type tag (§12.1); `%runtime` (§12.7).

**Revision 2 October 2026.** `.R:n` and `.R.n` cap at 14 digits (§13.1). A precision tag rounds the value when the field is set, by value or by body (§13.1). `math.ts` rounds with arithmetic only, exactly for every real number of up to 15 significant digits; rounded values are compared with the relative epsilon, never `===` (§13.8). Tx islands — dotted calls that carry TxData semantics into a `>>` body: `.areEqual` and `.safeSum` (§16.7).

**Revision 3 October 2026.** Discriminated unions (§11.6): the type name is the discriminator; every instance of an object arm carries `$type`, and `instanceof` is generated; routers for abstract members are 🔮 TxCode. `^:` declares a union's shared interface. `^` marks an abstract member — one tied to the type and defined by every implementer, such as `^to.$$` — as distinct from a required field, which is tied to construction (§10.2); `.%` is the receiver. A user-defined interface is always abstract, with at least one `^` member; the numeric interfaces are the exception (§10.1). A typed `.Error` and the result suffix `.T??`; `.T?!` is 🔮 TxCode (§11.1). Erasure keeps `$type` on union arms (§12.1).

**Status markers**

| Marker | Meaning |
|---|---|
| ✅ | Settled — design fixed, safe to build against |
| ❌ | Designed, not built |
| ❓ | Open — see §22 |
| 🔮 | Deliberately deferred to a later version |

In the §22 Status column: ✅ resolved · 🟡 partially resolved · 🟠 unresolved.

---

## Table of Contents

1. [Scope](#1-scope)
2. [Terminology](#2-terminology)
3. [Where TxData Lives](#3-where-txdata-lives)
4. [Lexical Rules](#4-lexical-rules)
5. [The Trait](#5-the-trait)
6. [Fields](#6-fields)
7. [Declaration and Definition](#7-declaration-and-definition)
8. [Construction](#8-construction)
9. [Composition](#9-composition)
10. [Interfaces](#10-interfaces)
11. [Containers and Sets](#11-containers-and-sets)
12. [The Type System](#12-the-type-system)
13. [Numbers](#13-numbers)
14. [Conversions](#14-conversions)
15. [Validators and Statics](#15-validators-and-statics)
16. [Code: the `>>` Pipe](#16-code-the--pipe)
17. [Compilation and Erasure](#17-compilation-and-erasure)
18. [Identity and Interning](#18-identity-and-interning)
19. [The Bridge to TxDoc and TxGen](#19-the-bridge-to-txdoc-and-txgen)
20. [Diagnostics and Editor Tooling](#20-diagnostics-and-editor-tooling)
21. [Implementation Plan](#21-implementation-plan)
22. [Open Items Register](#22-open-items-register)
23. [Design Notes](#23-design-notes)

Appendices: A. Keyword and Operator Reference · B. System Types · C. Worked Examples

---

## 1. Scope

TxData is an immutable, statically typed data language. It exists so that a document can carry structured, validated data — component props, page metadata, tables, vectors, settings — without YAML's untypedness or JSON's quoting.

**In scope:** traits, fields, construction, composition, interfaces, containers, the number lattice, conversions, validators, compile-time JavaScript bodies, erasure to plain JavaScript objects.

**Out of scope (🔮 TxCode):** mutability, runtime type information, `instanceOf`, reflection, generics beyond the one system form in §12.4, function overloads, ESM module traits.

**Design goals**

1. **Everything is a trait.** One construct covers records, classes, interfaces, mixins, enums, unions and functions. No boilerplate to choose between them.
2. **Immutable by default.** No deep copies, no deep equality, no aliasing bugs. Every value is a literal in the sense that C treats string literals.
3. **Types erase.** The compiler holds the type map; the output is plain objects, primitives and arrays. Nothing type-related ships.
4. **Deterministic.** The same source always produces the same output. No clock, no network, no filesystem inside user code.
5. **Text-friendly.** Strings are never quoted. Delimiters read as punctuation. The opposite of JSON.
6. **Signature recognition.** Meaning comes from shape — `: ` versus `:`, a bare name versus a dotted one, `in` versus `on` versus `add`.

---

## 2. Terminology

| Term | Meaning |
|---|---|
| **trait** | The single construct. A named set of fields, each with a type and optionally a value. |
| **field** | A member of a trait: name, type, kind, and possibly a value. |
| **kind** | Which of the five field kinds a field is (§6). |
| **declare** | Introduce a new field. Bare name: `x in .Z`. |
| **define** | Give a declared field its value. Dotted name: `.x: 42`. |
| **construct** | Produce a value from a trait once every required field is filled. |
| **constructable** | A trait with no unfilled required fields. Only constructable traits may be referenced as values. |
| **module trait** | A trait formed by a data block: a global head as the base layer, with the file's fences merged over it. |
| **partial module trait** | A module trait before merging — the head, or one fence. |
| **key head** | The left side of an assignment: name, keywords, type, attributes. Also called the **Key Area**: the key's type is declared here (§7.1). |
| **Value Area** | The value head and value body together: where the key is defined. |
| **instance** | A trait once it is constructable. Immutable, so passed around by reference. |
| **value head** | The right side of an assignment on the same line. |
| **value body** | The indented lines under an assignment. |
| **TxKeyRef** | A reference to a TxData value from TxDoc text: `%.name`. |
| **interning** | Caching a constructed value by content so equal values share one object. |

---

## 3. Where TxData Lives

### 3.1 Three containers ✅

**A `tx-d` fence inside a TxDoc.** The primary form.

````
```tx-d
n: 42
```
````

A fenced code block, not a custom syntax. `remark-parse` hands over a `code` node with `lang: "tx-d"` and the raw `value`, blank lines preserved, untouched by every later phase. This is the reason for the choice: it gives Phase 0 a claimable node with no micromark extension, and it renders inert in Obsidian. (Obsidian's `%%` is a comment delimiter, which is why an earlier `%%data:` design was abandoned.)

✅ The fence name is **`tx-d`**.

**A `.txd` file.** The same grammar in its own file. Used for global heads and for standalone typed data that anything can consume via `tx data --out json`.

**`_meta.md`.** A markdown file containing a `tx-d` fence, holding folder metadata (§19.3). Markdown rather than `.txd` so Obsidian can edit it; text outside the fence is ignored.

### 3.2 Data blocks are traits ✅

A document's data is one **partial module trait**:

```
global head (.txd)  +  fence 1  +  fence 2  +  …   =  the document's module trait
```

Every field in the global head is top-level in every document's module trait. Fences within a document merge in document order.

**Set rules apply.** A trait is a set, so a key signature occurs once. Declaring `x in .Z` in one fence and defining `.x: 42` in a later one is legal — two different signatures. Declaring `x` twice, or defining `.x` twice, is an error.

**One override per file.** A global head is a **base layer**. Each descendant file — a TxDoc's fences taken together, a `_meta.md`, or a daughter `.txd` file — is a new layer over it, so it may set each top-level field the head declares **once**, overriding the head's value (§7.3). Within one file the fences still merge as a single set, so two fences in the same file setting the same field is an error. This is how a head offers defaults that a file may change: `tx-folder` (§11.5) and module settings (§3.5).

**Top-level fields must be filled.** A module trait is always constructed, so a required top-level field with no definition is a compile error naming the field.

### 3.3 Two global heads ✅

There are exactly two:

| Head | Applies to |
|---|---|
| `TxData-Head.txd` | every document's module trait, and every daughter `.txd` file |
| `TxFolder-Head.txd` | every `_meta.md` folder trait (TxGen §8) |

Both are project files, configurable in location. They have access to `TxConfig` because `.$$` values go through the Tx-md pipeline (§19.4).

**TxComponent props traits are global too.** Each component's props are rewritten as a TxData trait (TxDoc §15.4), and every such trait is in scope in every document, so `in .DesmosProps` works in any fence. Whether they live in `TxData-Head.txd` itself or in `.txd` files it imports is open (§22 #38); either way a name defined twice across global files is an error.

"Global" is deliberately simple. The output is an SSG document tree built in one pass, not a web application, so one project-wide scope is enough.

### 3.4 Scope and resolution ✅

- **Data is parsed before any text is walked.** So a TxKeyRef anywhere in a document resolves against everything in every fence, regardless of position.
- **Inside the data, declaration order governs — above, at data-block level.** `m: >> .n + 1` before `n: 42` is an error: nothing may reference what does not yet exist. This kills reference cycles structurally rather than by detection. Global heads and props traits count as above everything; then earlier fences in document order; then earlier fields in the same fence. (Inside a trait body, forward references to the trait's own members are legal — §17.2.)
- **A `_meta.md` fence is scoped to its folder.** Scope comes from line-range containment, established at Phase 0, not from the block tree.

### 3.5 Module settings ✅ / ❓

A global head can expose a **module setting**: a top-level field with a default, which any daughter file — a `tx-d` fence in a TxDoc, a `_meta.md`, or a daughter `.txd` — may override once (§3.2). `tx-folder` (§11.5) is one. `trait-add-mode` is another, in `TxData-Head.txd`:

```
Trait-add-mode in .$^{}:
	Name-spaced
	Flattened

trait-add-mode in .Trait-add-mode: Name-spaced
```

In a daughter file:

```
.trait-add-mode: Flattened
```

`trait-add-mode` sets how `add` composes traits in that file: namespaced, the default (§9.2), or flattened as if every `add` carried `%<`. The user chooses the default rather than the language imposing one.

The members are strings — a `.$` XOR set (§11.2) — so they are written bare, not dot-referenced. Since `.$` is the default type, the bare-suffix rule (§11.1) allows `Trait-add-mode in ^{}:`.

❓ With `Flattened` as a file's default, flattening collisions (§9.3) become more likely, and there is no marker to ask for a namespaced `add` at one site (§22 #50).

---

## 4. Lexical Rules

### 4.1 The Assignment Colon ✅

**Signature: `: ` (colon plus whitespace) or `:` at end of line.** Formally `/:(?=\s|$)/`, **first match only**.

```
arr1 in .N[]: 1, 2, 3          value head
arr2 in .N[]:                  value body follows
	1
	2
```

This is the load-bearing lexical rule, and it holds because **no key-head token can contain a spaced colon**. Names are `[\w-]+`; types have no internal spaces (`.R:5`, `.N[][]`, `.inline<.$[]>`); delimiter attributes are `%` plus one or two characters. Every other colon in the language is unspaced:

| Colon | Example |
|---|---|
| assignment | `x: 42` |
| precision | `.R:5` |
| generic projection | `T:child` |
| set key/value pairing | `.$:.W\|{}` |
| static/system prefix | `:#max`, `:_validator` |
| array record terminator | a line containing only `:` |

**One exception needs care.** A JavaScript body can contain a spaced colon:

```
.$: () => .content > 0 ? "pos" : "neg";
```

First-match splitting handles it — the `?:` colon is downstream of the cut. But a *member body line* must not be run through the key-head splitter at all. Discriminate by shape: a line matching `name [in .Type] [%attrs]:` is a key head; anything else inside a value body is content. ❓ (§22)

### 4.2 Names ✅

`[\w-]+` — letters, digits, underscore, hyphen. Kebab-case, snake_case and PascalCase are all permitted; no case normalisation, ever. `%ol-A` and `%ol-a` must stay distinct.

Compiled to JavaScript, non-identifier names are quoted object keys.

### 4.3 Comments ✅ / ❓

**`// ` for line comments in data.** Space before, space or end-of-line after. That keeps `https://example.com` safe.

❓ Whether a trailing `//` is permitted at all, or comments must be whole-line, is open. Whole-line-only is the safest reading and costs little.

**`%% … %%` for comments inside `.$` and `.$$` values.** Inside a string value, `//` is ordinary text, so prose comments use the Obsidian pair. This means the data parser strips comments *after* the `: ` split, on the value portion only — a second stripper, separate from Phase 0's document-level one. An unterminated `%%` ends at the value's end. 🔮 Deferred to a later version; not needed for a working build.

### 4.4 Numeric literals ✅

Digit grouping uses `_`, as JavaScript does: `9_007_199_254_740_991`. Comma grouping is impossible because `,` is the default numeric array delimiter.

Type inference from a literal: an integer literal is `.Z`; a decimal literal is `.R:n` where `n` is its significant-digit count. Trailing zeros are significant and must be captured from the source text before `Number()` is applied — `4.10` is `.R:3`, not `.R:2`.

### 4.5 Delimiters ✅

| | Content Area (value head) | Value body |
|---|---|---|
| Outermost dimension | type default, or the leftmost `%` attribute | **newline** |
| Inner dimensions | `%` attributes, innermost-first | `%` attributes, innermost-first |

Type defaults: `.N[]` and other numeric arrays → `, `; `.$[]` → ` :: `.

Delimiter attributes live only in the key head, so they never collide with text scanning. Character class `%([;,$]|\w+)`:

```
strs in .$[]: abc :: def :: hij
arr1 in .N[] %;: 1; 2; 3
arr3 in .N[] %,: 1, 2, 3
arr4 in .N[] %sp: 1 2 3
mat1 in .N[][] %sp %;: 1 2 3; 4 5 6; 7 8 9
mat2 in .N[][] %sp:            // newline delimiter implied for the outer dimension
	1 2 3
	4 5 6
```

Delimiters carry spaces by convention (`, ` and ` :: `), with `%sp` the necessary exception.

**The `:` record terminator.** In a value body holding an array of traits, a line containing only `:` closes the current record and opens the next. The trailing record needs no terminator; a leading one is an empty record and an error.

```
.expressions:
	.id: n
	.latex: n = 42
	:
	.id: line1
	.latex: y = x^2
```

### 4.6 Sigils ✅

| Sigil | Where | Meaning |
|---|---|---|
| bare name | key head | **declare** a new field |
| `.name` | key head or body | **reference** an existing field — declared here or inherited |
| `.Name` | type position | a type |
| `%name` | key head | a key attribute (delimiter, etc.); or a named parameter in one-line construction from text |
| `%.name` | inside `.$` / `.$$` values, and in TxDoc text | a TxKeyRef |
| `#name` | key head | const |
| `:#name` | key head | static constant on the type record |
| `:_name` | key head | system hook (validators) |
| `^Name` | type declaration | an interface or abstract trait |

**Why the text/data split.** In TxDoc text, `%.` distinguishes a TxData reference from a dot-tag and from a `%` attribute. Inside a fence there are no dot-tags competing, and references are far too frequent for the longer form, so a bare `.` suffices.

---

## 5. The Trait

A trait is a named set of fields. That single construct plays every role:

| Role | How |
|---|---|
| record / object expression | fields with types and values |
| class with single inheritance | `on` |
| interface | `^` declaration, used with `on` |
| mixin | `add` |
| enum / flag set | `^{}` / `\|{}` containers |
| function | a field whose value is a `>>` body |
| discriminated union | `.Type^{}` plus `as` |
| primitive wrapper | a trait with only `to.%`, flattened (§12.2) |

There is no separate `function` concept. A trait member may hold a value or a parameterless body returning a value, and those are the same thing to the consumer — which is why an earlier "trait function" idea was dropped as redundant.

**Multi-stage construction** is what makes one construct cover all of this: a trait accumulates fields and values across layers, and becomes usable at the moment the last required field is filled. That is also the answer to "what do I wish TypeScript gave me" — default values on interfaces, mixins without diamond resolution, and immutability without ceremony.

---

## 6. Fields

### 6.1 The five kinds ✅

| Kind | Syntax | Has a value initially | Overridable later | Required to construct |
|---|---|---|---|---|
| **required** | `x in .Z` | no | yes | yes |
| **const required** | `#x in .Z` | no | **once only** | yes |
| **const** | `#x in .Z: 42` | yes | no | — |
| **default** (overridable) | `x in .Z: 42` | yes | yes | — |
| **optional** | `x in .Z?` | `.none` | yes | no |

`?` is a suffix on the **type**, not on the key — one source of optionality. `x in .$?` is exactly `x in .$ ^ .none: .none`.

`.none` is the single source of null, compiling to JavaScript `null`. `.some` means not-`.none`.

**`#` is written on the declaration only.** A reference never carries it: a field declared `#to.$$` is referenced as `.my-field.to.$$`. ❓ Whether `#` sits at the left-most end of the key (`#to.$$`, `#x in .Z`) or next to the type is open (§22 #48).

❓ `#` versus `:#`. `#name` is a const field; `:#name` is a static constant on the type record. The two are distinct but the visual similarity is a hazard — confirm before both ship.

### 6.2 Kinds are two axes

The five collapse to a grid, which is easier to document:

| | no default | has default |
|---|---|---|
| settable | required | default |
| const | const required | const |
| nullable | — | optional |

### 6.3 Const required ✅

The useful property: a layer that fills a `#` field freezes it for everything downstream.

```
Foo %<:
	#a in .Z          // const required
	#b in .N: 1       // const
	c in .Z           // required

Bar add .Foo:
	.a: 84            // the one permitted set

x in .Bar: 23         // fills .c;  .a is 84, guaranteed
```

---

## 7. Declaration and Definition

### 7.1 The rule ✅

**Bare name declares. Dotted name defines or overrides.** The parser keys on the presence of `in`:

| Form | Meaning |
|---|---|
| `x in .Z` | declare |
| `.x: 42` | define or override |
| `x in .Z: 42` | declare and define together |
| `.x in .Z` | **illegal** — cannot re-declare |

**Key Area and Value Area.** The Key Area (key head) declares the key's type, including `as`, which resolves a type union to one arm there (§11.4). The Value Area (value head and value body) defines the key. Typing never happens in the Value Area.

**The `.` goes left-most.** A reference to something that exists carries its `.` at the far left of the key: `.x`, `.to.$`, `.tx-folder`. A bare key is a declaration, and a name is declared once — in a trait or in any trait it inherits from. So every inherited member is reached with `.`, and nothing can be referenced before it exists: a type before it is declared, a field before it is defined or constructed.

### 7.2 One shot per trait ✅

Within one trait, a field may be declared once and defined once. Two `.x:` lines in one trait body are two identical signatures in one set — already illegal by the trait rule, no special case needed.

**Definition is wholesale.** A trait-typed field cannot be filled in instalments:

```
Thing:
	x in .Z
	y in .Z

m in .Thing
.m:              // illegal — partial
	.x: 42
.m:              // illegal — second signature
	.y: 84

n in .Thing      // legal — one complete definition
.n:
	.x: 42
	.y: 84

p in .Thing: 42, 84    // legal — tuple form, one definition
```

### 7.3 Overriding across layers ✅

A trait that inherits is a **new trait**, therefore a new set, therefore a first signature. That is why override and one-shot are the same rule rather than two:

```
Bar:
	x in .Z            // declare
Bat add .Bar:
	.x: 42             // define — first signature in Bat
Baz add .Bat:
	.x: 48             // override — first signature in Baz
v in .Baz:
	.x: 23             // instance override — first signature in v
```

A field's declared **type** is fixed at declaration and binds every layer below. A layer may replace a trait-typed field's value wholesale with another value of that type, but may not change the type.

❓ Whether a *descendant* type satisfies `in .T` — variance — is open (§22).

---

## 8. Construction

### 8.1 Construction is definition ✅

Three syntaxes, one act:

```
n in .Thing:              // named body
	.x: 42
	.y: 84

p in .Thing: 42, 84       // unnamed tuple, value head

q in .Thing:              // unnamed tuple, value body
	42
	84
```

### 8.2 Auto-construction ✅

If a trait has no unfilled required fields, constraining a field to it both declares and constructs:

```
Thang:
	a in .Z: 88
	b in .Z: 99

t1 in .Thang          // declared, defined and constructed
t2 in .Thang:         // constructed with overrides
	.a: 44
```

So `in .T` means "declare, awaiting definition" or "declare and construct" depending on `.T`. Decided by the type, not visible locally — which is precisely why the IDE hover and the unfilled-field diagnostic matter (§20).

### 8.3 Tuple positions ✅

Positional arguments are the **declaration order of the fields still unfilled at construction** — not of all required fields. Composition order therefore sets tuple order:

```
Baz add .Foo .Bar     // .a first, then .m
Bax add .Bar .Foo     // .m first, then .a
```

Fragile by nature: adding a required field upstream shifts every positional call site. The named form is always available and is the recommended form for anything non-trivial. No artificial arity cap is imposed.

### 8.4 Named body versus tuple body ✅

Both open with a dotted name in some cases. The discriminator is the assignment colon: `.vals:` names a member; `.v1` alone is a positional reference. Mixing named and positional in one body is an error.

### 8.5 Filling a 1-D array ✅ / ❓

A one-dimensional array field or parameter accepts four input forms:

```
sum in .sum: 1.23, 3.45, 5.67       // members
s5 in .sum: .v1                     // one array by reference
s6 in .sum: .v1, .v2                // several arrays, flattened into one
s7 in .sum: 1.23, .v1, 5.67         // members and arrays, mixed
```

**Rank decides, and there is no spread operator.** For a `.T[]` input, an item of type `.T` is a member and an item of type `.T[]` is flattened in. For `.T[][]`, a `.T[]` item is a row and a `.T[][]` item is flattened in. Handing several arrays to a 1-D field can only mean *combine them* — otherwise why the apparent type mismatch? — so the mismatch is the signal. Simple and intuitive rather than a grammar rule to nitpick. (Settles §22 #11.)

❓ Rank does not settle one case. A trait with an array-typed required field *and* another required field of the element type, constructed by tuple — `vals in .N[]` and `n in .N`, then `f in .Foo: 1, 2, 3, 4` — gives no mismatch to show where the array ends. Rule needed: array-typed required fields last, or the named form mandatory for such traits (§22 #10).

### 8.6 No spread operator ✅

Tx has no `...`. The two places other languages reach for one use a plain rule instead: filling a 1-D array (§8.5), and handing a whole props structure to a TxComponent with `%props:` (TxDoc §15.4). The remaining job a spread does — shared defaults with per-use overrides — is multi-stage construction:

```
GraphBase add .DesmosProps:
	.settings:
		.xAxisStep: 1.5708

g1 in .GraphBase:
	.expressions:
		.id: line1
		.latex: y = sin(x)

g2 in .GraphBase:
	.expressions:
		.id: line2
		.latex: y = cos(x)
```

`GraphBase` holds the shared settings; `g1` and `g2` fill the rest. An override replaces a trait-typed field wholesale (§7.3), so settings varied independently belong in separate fields.

---

## 9. Composition

### 9.1 Keywords ✅

| Keyword | Meaning |
|---|---|
| `in` | constrain to one **closed** type — instantiate only, never extend |
| `on` | single inheritance: base first, then `^`-declared interfaces |
| `add` | mixin composition of any number of traits |
| `as` | select one arm of a type XOR set |
| `of` | set the default member type |

`on .Base .IFoo .IBar` — **the base, if present, comes first; everything after must be `^`-declared.** Enforced, not conventional, because nothing else in the line distinguishes them. No commas: every name is dot-referenced.

`add .Foo .Bar on .IA .IB` combines both.

`in` seals: `InBase in .Base: b in .R:4` is illegal. That is the whole justification for having two keywords, and it means a parameter typed `on .ISomething` is the way to accept a family of types.

### 9.2 Flattening ✅

`%<` flattens a trait's members into the inheriting namespace instead of nesting them under the trait name.

```
Foo %<:            // flatten at declaration
	a in .Z
	b in .$

Y add .Foo         // flat, because Foo declared it
Z add .Foo %<      // flat, chosen at the inheritance site
```

| Declared | Added as | Result |
|---|---|---|
| `Foo %<` | `add .Foo` | flat |
| `Foo` | `add .Foo %<` | flat |
| `Foo %<` | `add .Foo %<` | ❓ redundant or error |

**Asymmetry:** traits may flatten at declaration or at inheritance. **Interfaces may flatten only at declaration**, so that casting to the interface finds members at a consistent path.

`%<` rather than a bare `<` avoids colliding with the generic bracket in `.Type<.ITxFolder>`.

### 9.3 Collisions ✅

Namespaced composition never collides — `.Foo.a` and `.Bar.a` are distinct. Flattened composition collides, and a collision is an **error**, including when the two members have the same type. No MRO, no diamond resolution: the fix is to not flatten the conflicting trait.

The type record carries an **origin** per field so the error can name both sources: *"`.a` flattened from both `.Foo` and `.Bar`."*

### 9.4 `add` recompiles bodies ✅

A `>>` body compiled against `.a` as a *value* emits `a`; against `.a` as a computed field it emits `a()`. So composition cannot copy emitted code — only source, recompiled at the point of full construction (§17.2).

---

## 10. Interfaces

### 10.1 What an interface is for ✅

Not a contract in the C# sense. **An interface constrains what a consumer sees.** A function that needs three of a trait's twelve fields declares a parameter of an interface type, and only those three are visible.

**A user-defined interface is always abstract.** It holds at least one abstract member (§10.2) — a member every implementer must define, which declares type structure rather than an instance value. Beyond that it is a trait like any other: it may carry default values, and its other members may be filled. `^` marks it as an interface and makes it non-instantiable alone, and its name starts with `I` (`^IFoo`).

```
^IFoo:
	a in .Z
	b in .R:3
	^unit in .$                // abstract — each implementer declares its own

Base:
	x in .$

SubBase on .Base .IFoo:
	.IFoo:
		.unit: cm

m in .SubBase:
	.IFoo:
		.a: 42
		.b: 3.33
	.x: a string

f in .$: foo in .IFoo: a: %foo.a, b: %foo.b
str: >> .f(.m)
```

**The numeric interfaces are the exception.** `.IN`, `.IW`, `.IZ`, `.IQ` and `.IR` are system-defined interfaces over traits that flatten to a primitive (§12.2). They hold no abstract members. Each preserves the type of the value it is given and denotes the operations closed under its number type (§13.2).

### 10.2 Abstract members and required fields ✅

An interface asks two different things of what implements it, and marks them differently:

- An **abstract member** is tied to the **type**. It is what distinguishes one implementer from another, and every implementer defines it as part of its own type declaration, by a value or by a `>>` body. It is marked `^`.
- A **required field** is tied to the **instance**. It is a value an instance must be given before it is constructed (§8.2), declared the ordinary way: without a value.

```
^ITxFolder:
	content in .$$?     // optional
	^to.$$              // abstract — every implementer defines .to.$$
```

In the TxFolder union (§11.5), `.TxBookFolder` and `.TxBlogFolder` differ only in how they define `.to.$$`, which binds each to its own wrapper. That definition belongs to their type structure, not to any one instance, so it is abstract.

`^to.$$` here is a **declaration**, not a reference. In the `to` namespace, `.$$` is both the key and its type (§14.1). Only `.to.$` is inherent to every trait; `to.$$` does not exist until a trait declares it, which is why it is written bare. Implementers define it with the `.` reference: `.to.$$:`. The usual kinds apply (§6.1):

| Declaration | Kind |
|---|---|
| `^to.$$` | abstract — defined by every implementer |
| `to.$$` | required — filled at construction |
| `to.$$?` | optional |
| `#to.$$` | const required — set once |
| `#to.$$: constant text` | const |

**Abstract computed members.** An abstract member may be computed: each implementer supplies its own `>>` body. It resolves to a value on construction like any computed member (§16.3). `.%` is the receiver — the instance itself, `this` — and is declared as the member's only parameter:

```
^process in .Response: .% in .PaymentMethod
```

Implementers define it with the `.` reference and a body: `.process: >> …`. Inside the body the receiver's members are reached directly (`.cardNumber`). A value the body needs, such as a fee, is a required field declared alongside it. ❓ Abstract members with parameters beyond `.%` are open (§22 #59).

Every user-defined interface has at least one `^` member (§10.1); its `^` members are what every implementer must define.

### 10.3 Parameters ✅

A parameter typed by an interface is how a family of types is accepted, given that `in` is closed. Inside a text value, parameters are referenced `%param` and members `%.member`, so `%foo.a` is a parameter's member and `%.foo.a` would be a member's member. ❓ Whether a parameter may shadow a member name needs a rule.

---

## 11. Containers and Sets

### 11.1 Suffixes ✅

| Suffix | Meaning |
|---|---|
| `.T[]` | array |
| `.T[][]` | 2-D array |
| `.T^{}` | XOR set — pick exactly one |
| `.T\|{}` | OR set — pick any combination |
| `.T?` | optional — `.T ^ .none`, defaulting `.none` |
| `.T??` | result — `.T ^ .Error`: the value, or the error that replaced it |
| `.T?!` | 🔮 TxCode — throwable result: `.T`, or the `.Error` is thrown |

`.Error` is a typed trait standing for the JavaScript `Error`, used as a union arm (§11.6). It carries `message` as an ordinary field, so it survives serialization as `{ "$type": "Error", "message": … }`; a JavaScript `Error` serializes as `{}`, because its `message` is not enumerable. `.T??` keeps an error as data. `.T?!` belongs to TxCode, where code runs and a thrown error can be caught.

`^{}` and `|{}` rather than bare `^` and `|` so that `[]`, `^{}` and `|{}` read as one family of container suffixes.

A bare suffix means the default type: `to.array: [] >> [.x, .y, .z]` is an array of the trait's default type.

### 11.2 XOR sets ✅

Three kinds of value set, told apart by the member type. Members are declared bare in every kind, because they are new names.

**String sets — `.$^{}`.** Members are strings, written bare wherever they are used:

```
Case in .$^{}:
	upper
	lower
	none

c in .Case: lower
```

**Enum sets — `.%^{}`.** Members are named values in their own right, referenced with `.` in the Value Area:

```
Trait-add-mode in .%^{}:
	Name-spaced
	Flattened

trait-add-mode in .Trait-add-mode: .Name-spaced
```

**Key/value enums — `.%:.T^{}`.** Each member pairs its name with a value of type `.T`, written with the assignment colon. Every member has the inherent fields `.key` and `.value`:

```
NamedColor in .%:.Hex^{}:
	Red: 0xFF0000
	Green: 0x00FF00
	Blue: 0x0000FF

color in .NamedColor: .Red
key in .$: .color.key            // "Red"
value in .Hex: .color.value      // 0xFF0000
```

`.Hex` is a 32-bit integer written with a `0x` prefix (Appendix B). A custom `.RGB` trait could hold one such integer and expose `red`, `green` and `blue` as computed members that shift it.

**Type sets — `.Type<I>^{}`** — are the fourth form: their members are types, and one is chosen with `as` in the Key Area (§11.4).

### 11.3 OR sets ✅

```
FileAccess in .%:.W|{}:
	read
	write
	exe

f1 in .FileAccess: .read | .write
b1 in .B: >> .f1.has(.read)
str1 in .$: >> .f1.to.$          // "read | write"
val1 in .W: >> .f1.to.W          // 0x03
```

`.%:.W` pairs an enum member with a binary value. Member names are open when the parameter is of that set's type, so `.read` needs no qualifier.

❓ `has()` is all-of or any-of. C# splits these; Tx should too.

### 11.4 Type unions and `as` ✅

```
TxFolders in .Type<.ITxFolder>^{}:
	.TxBook
	.TxBlog

tx-folder in .TxFolders

.tx-folder as .TxBook:
	.my-book-value: some value
```

`as` selects one arm. It is **not a cast**: only an arm of a declared set can be selected, nothing outside it. The **type name is the discriminator**: unlike TypeScript, no discriminant field is declared, and the compiler writes the arm name into each instance as `$type` (§11.6).

**Unions of unions flatten.** `{T1, {TA,TB}, T3}` is `{T1, TA, TB, T3}`, so nested `as` is never required. A nested union name remains useful as a reusable alias. Duplicate arms after flattening are an error, as is an arm that subsumes another (`.N ^ .Z` is just `.Z`).

`|{}` on types is illegal — a value cannot be two types at once.

**Discriminating and exhaustiveness.** In the Key Area an arm is selected with `as`. Inside a `>>` body it is tested with `instanceof .Arm` (§11.6). Exhaustiveness comes from the declaration, not from analysing code: every arm must implement each `^` member of the union's interface.

### 11.5 Worked example: the TxFolder union ✅ / ❓

The folder model of TxGen (TxGen §8) is the reference example of a type-discriminated union. TxGen uses the same example.

**`TxFolder-Head.txd`** — the TxGen global head (§3.3), merged first into every `_meta.md` module trait:

```
^ITxFolder:                         // interface
	props in .FolderWrapperProps?   // set by the system (TxGen)
	title in .$$?                   // set by the user
	description in .$$?             // set by the user
	date in .Date?                  // set by the user
	content in .$$?                 // set by the user
	^to.$$                          // abstract: defined by every implementer (§10.2)

TxDefaultFolder on .ITxFolder:
	.to.$$:
		.TxDefaultFolderWrapper: %props: %.props
			%.content

TxBookFolder on .ITxFolder:
	.to.$$:
		.TxBookWrapper: %props: %.props
			%.content

TxBlogFolder on .ITxFolder:
	.to.$$:
		.TxBlogWrapper: %props: %.props
			%.content

TxFolders in .Type<.ITxFolder>^{}:   // type XOR set
	.TxDefaultFolder
	.TxBookFolder
	.TxBlogFolder

tx-folder in .TxFolders as .TxDefaultFolder:
	.content:
		This is the .i{default} landing page text.
```

**A book folder's `_meta.md`** — selects an arm and sets this folder's metadata:

````
```tx-d
.tx-folder as .TxBookFolder:
	.title: My Book
	.description: This is a short description of My Book.
	.date: 2026-09-29
	.content:
		This is an intro to My Book
```
````

What it shows:

- **The arm name is the discriminator.** `as .TxBookFolder` selects the arm by name. The arms differ in value — each defines `.to.$$` its own way — so the trait name suffices, and no discriminant field is ever declared. The compiler writes it as `$type` (§11.6).
- **A fully constructed trait is an object expression** — type and data combined. Construction is complete when no required field remains; fields may still be overridden. That is what separates Tx from TypeScript or C#, where the type is one thing and the data another.
- **Dispatch through members, not narrowing.** A consumer never asks which arm it holds. It uses `.tx-folder.to.$$`, and each arm answers with its own body. No narrowing syntax is needed for this pattern (§22 #12 still applies elsewhere).
- **Here the union value never leaves the compiler.** What crosses the SSG boundary is the result of `.to.$$` — a TxBlock naming a TxComponent, with erased props — not the union value. A union value that does cross carries its `$type` (§11.6, §12.1).
- **Two levels of authorship.** `.to.$$` is set once, system-level, in the head: it binds each folder kind to its wrapper TxComponent, which `TxConfig.ts` maps to a React component. Per folder, the user only selects the arm and fills the metadata — a book, a blog, or a default landing page for a section of the tree grouped by category, subject or anything else.
- **Selecting an arm constructs.** Every field of `.TxBookFolder` is optional or already defined, so it has no required fields left: `.tx-folder as .TxBookFolder` alone resolves the union and assigns an instance. A trait becomes an instance at the moment it is constructable; because Tx is immutable, the instance is passed around by reference (§18). TxGen supplies `props` afterwards, as the final system-level layer (TxGen §8.2).

**The head declares and sets a default; a file overrides it.** `tx-folder in .TxFolders as .TxDefaultFolder:` declares the field, resolves the union to its default arm in the Key Area, and sets a default `.content`. A folder's `_meta.md` overrides it once (§3.2) with `.tx-folder as .TxBookFolder:`. A folder without `_meta.md` keeps the default — the default landing page.

### 11.6 Discriminated unions ✅ / ❓

In TypeScript, a discriminated union is built by hand. Each arm declares a literal field — `CreditCardPayment` carries `method: 'credit_card'` — and the author writes the narrowing switches, which the compiler analyses for exhaustiveness. The type name and the field say the same thing twice.

In Tx the **type name is the discriminator**. The compiler knows the full set of arms from the declaration, so it generates what a TypeScript author writes by hand:

| Generated | What it is |
|---|---|
| `$type` | a string property on every instance of every object arm, holding the arm name — at build and in the output |
| `instanceof .Arm` | a `Symbol.hasInstance` hook that reads `$type`; instances stay plain objects, never classes, because a trait is constructed in stages (§17) |

🔮 **Routers belong to TxCode.** A generated router per abstract member — a function in the union's type record that takes the instance as `.%`, runs `switch (true)` with an `instanceof` test per arm, and calls that arm's implementation — needs strong typing inside code blocks to reference overloaded functions (§22 #31, #63). In TxData, an implementation's inputs are required fields and its abstract members are computed members that resolve inside the type on construction, so no `instanceof` routing is written outside the type.

```
PaymentMethod in .Type^{}:
	^:
		Response in .Type^{}:
			Success:
				code in .$
			Failure:
				message in .$
		^process in .Response: .% in .PaymentMethod
	CreditCard:
		cardNumber in .$
		cvv in .$
		expiry in .$
		.process: >>
			const result = .chargeCreditCard(.cardNumber, .cvv, .expiry);
			if (result instanceof .Error) return .Failure(result.message);
			return .Success(result);
	PayPal:
		email in .$
		payerId in .$
		.process: >>
			const result = .redirectPayPal(.email, .payerId);
			if (result instanceof .Error) return .Failure(result.message);
			return .Success(result);
	Crypto:
		walletAddress in .$
		blockChain in .BlockChain
		.process: >>
			const result = .transferCrypto(.walletAddress, .blockChain);
			if (result instanceof .Error) return .Failure(result.message);
			return .Success(result);

myPayment in .PaymentMethod as .Crypto:
	.walletAddress: …
	.blockChain: .Bitcoin

responses in .PaymentMethod.Response[]: >> .payments.map((p) => p.process);
```

`.chargeCreditCard`, `.redirectPayPal` and `.transferCrypto` stand for functions typed `.$??` (§11.1). `myPayment` reaches the output as:

```json
{ "$type": "Crypto", "walletAddress": "…", "blockChain": "Bitcoin",
  "process": { "$type": "Success", "code": "…" } }
```

What it shows:

- **`^:` is the union's interface.** It is an anonymous interface that every arm is `on`. Types declared inside it, such as `Response`, are visible to the arms as `.Response`, and outside as `.PaymentMethod.Response`. A value an abstract member needs, such as a fee, is a required field declared here.
- **Arms are declared inline or referenced.** A bare name with a body declares a new type (`CreditCard:`); a dotted name references an existing one (`.TxBookFolder`). A bare name with no colon declares an arm that adds nothing — `Loading`, not `Loading:` — and its instance is `{ "$type": "Loading" }`, the discriminator alone. Such an arm is not allowed when the union's interface has abstract members or required fields, since it would define none of them.
- **Abstract members resolve on construction.** `.process` takes only the receiver, so each instance computes it once, when it is constructed, and holds the result as a field (§10.2). `.payments.map((p) => p.process)` reads values; it calls nothing, and no routing happens.
- **Construction inside a body.** `.Success(result)` constructs an arm by tuple (§8.3). It is equivalent to `x in .Response as .Success: …` in the Key Area.
- **Primitive arms carry no tag.** A `.$` or `.R` arm cannot hold a property; `typeof` tells it apart.
- **Incoming data is discriminated by `$type`.** A record entering a union takes the arm its `$type` names and is validated against that arm. An unknown or missing `$type` is a build error.
- **Consumers narrow on the field.** A TxComponent receives plain data and narrows with `p.$type === "Crypto"`, as a TypeScript author would with `method` — no Tx machinery is needed in the browser (§19.2).
- **`$type` is part of the value,** so it is part of the interning key (§18.3).

❓ Abstract members with parameters beyond `.%` (§22 #59). Whether `instanceof` is true for every arm of a nested or sub-union, such as `instanceof .Response` (§22 #60). Sub-unions with `as` and `del`, and how a sub-union type declaration is told apart from a field declaration (§22 #61). Generic unions such as `Result<T>` wait on generics (§22 #30); their error arm is the system `.Error`. Whether the `instanceof` hook is emitted with ES-module output (§22 #62).

---

## 12. The Type System

### 12.1 Erasure ✅

Types live only in the compiler's map. After compilation the output is plain JavaScript objects, primitives and arrays — no classes, no closures, and no tags except on union arms.

**`$type` on union arms only.** Every instance of an object arm of a union carries `$type`, its arm name, in the output as well as at build (§11.6). It is what lets union data go out and come back in. Nothing else carries a tag. TypeScript components receive plain data and impose their own static types, exactly as Tx does, narrowing on `$type` where a union arrives.

### 12.2 Primitive flattening ✅ / ❓

A trait that holds only one primitive value erases to that primitive by itself, rather than to an object. That is what makes `.Z`, `.N`, `.URL` and `.CSSLength` cost nothing at runtime while still carrying constraints at compile time.

`.Q` cannot flatten — it holds two `.Z` — which has a codegen consequence (§13.5).

A primitive-value trait marked `%runtime` (§12.7) cannot flatten either: to answer `instanceof`, it becomes an object holding the primitive and `$type`.

❓ With `to.%` removed (§14.1), the member that holds a primitive trait's value needs a new form (§22 #49).

### 12.3 The type record

Per trait, held by the compiler and discarded after:

```
trait name
per field:  key · type · kind · value · origin
statics:    :# constants
hooks:      :_ validators
```

`origin` traces a flattened member to its source trait, for collision and unfilled-field diagnostics.

### 12.4 `.Type<I>` — a system form, not generics ✅

`.Type` is the type of types. `.Type<I>` constrains it to types implementing interface `I`.

```
.Type<.ITxFolder>^{}
```

**This is one built-in parameterised form, not a general mechanism.** No user-defined generics, no type parameters elsewhere, no inference. Adding real generics later need not be compatible with it.

Suffix order is generic argument, then container: `.Type<I>^{}`, matching `.R:3[]`.

Constraint satisfaction is transitive: `TxTextbook on .TxBook` satisfies `.Type<.ITxFolder>` because interfaces pass down the inheritance chain.

### 12.5 Structural identity and projection ✅ / ❓

**Two traits with identical fields — names, types, kinds and values — are the same type.** Values participate, which is why `.TxBook` and `.TxBlog` remain distinct despite the same shape: their `to.$$` bodies differ.

The hash covers `>>` body **source text**, so it is syntactic: a renamed local changes the hash. Conservative, and worth stating.

❓ **Projection** — assigning a wider value to a narrower slot — is a different operation from structural identity, and is currently implicit:

```
vf in .VecFields of .R:4: .v      // .v is a .MyVec3 with more members
```

That is not "same hash"; it is "source has at least these members, keep those, discard the rest," producing a **new** value. Implicit projection can silently swallow a wrong argument. Decide whether it needs a marker.

**Structural for assignment, nominal for unions.** `in` accepts by shape; `as` selects by declared name.

### 12.6 Intervals ✅ / ❓

```
a .. b        a <.. b        a ..< b        a <..< b
```

Used in type position: `.N` is `.% in 1 <.. .Z:max`. ❓ This puts a type-level *expression* in a type slot, referencing another trait's static — a capability that appears nowhere else. The compiler must evaluate it.

❓ `.%` in this form meant the trait's own value. `.%` now names the enum-member type (§11.2), so this form needs rewriting together with the `to.%` replacement (§22 #49).

### 12.7 `%runtime` 🟡

Types erase, so a plain object cannot say which trait it came from. `%runtime` in a trait's key head opts that trait in to runtime checking:

```
A %runtime:
	…
```

A `%runtime` value carries its trait name in a `$type` string property. The compiler emits `isTrait(value, name)` and a `Symbol.hasInstance` hook, so `instanceof .A` works inside `>>` bodies. The tag must be a plain string property: values reach the Worker through structured clone, which drops Symbol-keyed properties. A primitive-value trait marked `%runtime` becomes an object holding the primitive and `$type` (§12.2).

Open (§22 #32): whether `instanceof` is true for descendants and implementers. Union arms always carry `$type`, unstripped (§11.6, §12.1). Tx-level reflection over type records is deferred to TxCode; on-the-fly types are built with TypeScript functions for now.

---

## 13. Numbers

### 13.1 The lattice ✅

| Type | Adds | Structure |
|---|---|---|
| `.N` | — | closed under `+`, `×` |
| `.W` | additive identity `0` | commutative monoid |
| `.Z` | additive inverses → `sub`, `dec` | ring |
| `.Q` | multiplicative inverses → `div` | field |
| `.R` | completeness → `sqrt`, `sin`, `exp` | complete ordered field |

`.R:n` is `n` significant digits; `.R.n` is `n` decimal places, `n ∈ [1, 14]`. Rounding to `n` digits is decided by digit `n + 1`. A double has 15 reliable digits, so the 15th is the last that can decide a rounding, and 14 is the most that can be kept (§13.8). Wider precision needs a 128-bit or arbitrary-precision number type 🔮.

**A precision tag rounds on set; it is not a closure constraint.** When a `.R:n` or `.R.n` field is set — by a value or by a `>>` body — the number is mapped through `precisionRound` or `fixedRound` (§13.8), and the rounded value is what is stored. Arithmetic is not closed under the tag: `9.99 + 9.99 = 19.98` has four significant figures, and becomes `20.0` only when it is set into a `.R:3` field. Floating-point error in the arithmetic before that point is out of scope, because it lives in the 16th digit and beyond.

### 13.2 Explicit versus interface ✅

| Form | Accepts | Returns |
|---|---|---|
| explicit `.Q` | anything at or below `.Q` | `.Q` — a **coercion target** |
| interface `.IQ` | anything at or above `.Q` | the input type — a **type-preserving bound** |

Those two cases are the whole of what the checker needs.

```
sum of .IW:
	vals in []
	to.%: >> .vals.reduce((acc, cur) => acc + cur, 0)
```

`.IW` not `.IN`, because `reduce`'s initial value `0` is not in `.N`, and an empty array returns `0`.

### 13.3 Closure ✅

A constrained output type may only use operations closed in it.

```
a in .Z: -1
b in .N: 2
c in .N: >> .a + .b     // illegal — not all solutions are in .N
```

Partial operations:

| Operation | Constraint |
|---|---|
| `pow(a in .N, b in .N)` | closed |
| `pow(a in .W, b in .W)` | `0^0` |
| `pow(a in .Z, b in .W)` | exponent must be `.W`; `2^-1` leaves the integers |
| `pow(a in .Q, b in .Z)` | `0^0`, and `0^n` for `n < 0` |
| `div(a, b)` | `b ≠ 0`; `.Q`'s own denominator needs the same constraint |
| `mod` | `.W` minimum — `6 mod 3 = 0 ∉ .N`. Accepts `.R`. |
| `idiv` | `.Z`; needed because `/` leaves `.Z` |
| `gcd`, `lcm` | `.W` minimum if zero is allowed |
| `factorial` | `.W → .N`; overflows past `18!` |
| `sqrt`, `exp`, `log`, trig | `.R` only |

`.R` is treated as closed throughout, because undefined results return `.NaN` and `.R` implies `.R ^ .NaN`.

**JavaScript `%` is remainder, not modulus.** `-7 % 3` is `-1` in JS, `2` mathematically. If `.Z` supports mathematical `mod`, emit `((a % b) + b) % b`.

**JavaScript gives `0 ** 0 === 1`.** That is the defensible answer — in algebra and combinatorics `0^0 = 1` is standard, counting the one empty function. What is undefined is `0^0` as a *limit form*, since the limit is path-dependent. If Tx rejects it anyway, the guard must be emitted rather than relied on.

### 13.4 Narrowing ✅

Widening is automatic; narrowing is forbidden **except** through functions whose purpose is to narrow:

| Function | Accepts | Returns |
|---|---|---|
| `floor`, `ceil`, `round`, `trunc` | `.R` | `.Z` |
| `sign` | `.R` | `.Z` in `-1 .. 1` |
| `abs` | `.Z` | `.W` — tightens the bound, not the set |

So the conversion-member rule (§14) does not give `.R` a bare `to.Z`.

### 13.5 `.Q` codegen ❓

`.Q` is the one numeric type where **operators do not compile to JavaScript operators**. `a + b` on two `.Q` values must emit `q_add(a, b)`, and `.Z / .Z` assigned to `.Q` must emit a constructor rather than JS `/`. It also needs normalisation by `gcd` with the sign in the numerator, or `1/2` and `2/4` compare unequal.

JavaScript has no operator overloading — `valueOf` can only return a primitive, which would discard exactness — so this is a compile-time rewrite or nothing.

**Mitigation:** if a function's domain is `.R`, let `.Q` widen to `.R` on entry. Then `.Q` arithmetic is special only inside functions explicitly typed `.Q`. And if `.Q` becomes load-bearing, wrapping Math.js (`math.fraction`) beats writing normalisation and overflow handling.

### 13.6 Bounds and overflow ❓

Closure handles set membership, not bounds. `.N` is `1 .. .Z:max`, and two large naturals overflow — undetectably, since past `2^53` integers silently lose precision.

Current position: **overflow surfaces only at `to.$`**, via an `isSafeInteger` check that outputs "Overflow". That means overflowed values travel silently through comparisons and into component props. Acceptable for a document language; worth knowing it is not protection. `BigInt` and `.C` complex are 🔮.

### 13.7 Mixed precision ❓

`.R:3 + .R.2` — the result falls to the lowest precision by default, overridable by explicit typing. The exact join rule needs stating.

### 13.8 Floating-point helpers ✅

`lib/transmission/utils/math.ts` is written and tested. It supplies the numerical behaviour `.R` depends on:

- **Relative epsilon by decade.** `2 × Number.EPSILON × 10^scale`, where scale is `floor(log10(|n|)) + 1`. `Number.EPSILON` alone is a base-2 quantity, correct only for mantissas in `[0.1, 1)`.
- **`safeAdd` / `safeSum`.** Collapse a cancelled result to exactly `0`, judged against the **largest magnitude** in the computation — not the result's own magnitude, which is tiny by construction. `safeSum` uses Neumaier compensated summation and applies one zero test at the end.
- **`fixedRound` / `precisionRound`.** Round the decimal the author wrote, not its binary approximation: nudge the magnitude up by `2 × Number.EPSILON` relative to itself, shift the decimal point, round, shift back. Half always goes away from zero, symmetrically. `(1.005).toFixed(2)` is `"1.00"` because the stored double is below 1.005; `fixedRound(1.005, 2)` is `1.01`.
- **Arithmetic only.** Rounding never takes a string round trip. `safeDecadeMultiply` and `safeDecadeDivide` move the decimal point, in two steps past `10^200` so no intermediate overflows, and a negative shift divides by the exact positive power rather than multiplying by an inexact negative one. `precisionRound` counts digits as `floor(log10|n| + 1)`, which stays correct where the `log10` of a 14- or 15-digit number rounds to an integer. Tested across `10^-308 … 10^308` (`MIN_SAFE_SCALE`, `MAX_SAFE_SCALE`).
- **The real number.** Base 2 and base 10 do not align, so a double is not the decimal it prints. The double for `1.005` is exactly `1.00499999999999989…`; the real number it stands for is `1.005`. Every real number of up to 15 significant digits lies within the nudge (`2 × Number.EPSILON`, relative) of its double, and `fixedRound` / `precisionRound` round that real number, not the binary digits.
- **The guarantee.** Rounding a real number of up to 15 significant digits to `n ≤ 14` digits gives exactly the decimal result, across the normal range of doubles (about `2.2 × 10^-308` to `1.8 × 10^308`). A decimal of up to 15 digits is either exactly on a half, which the nudge carries up, or a whole unit of the 15th digit away from it, tens of ULP outside the nudge. So the nudge never moves a value that is not a half. The tests check this against exact decimal arithmetic over seeded decimals, half of them built as exact halves.
- **Why 14.** Rounding to `n` digits is decided by digit `n + 1`, so the 15th digit is the last that can decide. Rounding to 15 would need the 16th, which a double does not hold (`MAX_PRECISION_DIGITS`, §13.1).
- **Scope.** The guarantee holds for values that carry 15 reliable digits: literals, and results of arithmetic whose error stays within the nudge. A subtraction that cancels leading digits leaves fewer: `(8.575 + 1e5) - 1e5` is `8.57499999999709`, already different from `8.575` in the 12th digit, so it rounds to `8.57`. Once that double exists, the digits are gone; `safeSum` avoids creating it (*Cancellation and `safeSum`*, below).
- **Cancellation and `safeSum`** ✅ / 🔮. Adding values of opposite sign cancels leading digits and exposes error that sat beyond the 15th digit of the larger values. With plain `+`, `1e5 + 8.575 - 1e5` is `8.57499999999709` and `1e15 + 8.575 - 1e15` is `8.625`. Multiplication and division cannot cancel. Three kinds of error can be exposed:
  - **The additions' own error — solved.** Neumaier compensation captures the bits each addition loses and adds them back, in any order and without sorting: `safeSum(1e5, 8.575, -1e5)` and `safeSum(1e15, 8.575, -1e15)` are both `8.575`. A cancelled total is still collapsed to exactly `0`.
  - **The operands' binary form — not solved by compensation.** Compensation works on the doubles it is given. When the large terms are not exact in binary, their representation error survives the cancellation: `safeSum(123456.789, -123456.788)` is `0.0010000000038417…`. The result is reliable to about the 15th digit of the largest term, not of the result — `0.001` at `.R:3`, noise at `.R:14`.
  - **Digits below the large terms' 15th digit — don't-cares.** A small term finer than the 15th digit of the large terms is lost unless the large terms cancel exactly. Under the 15-digit rule those digits carry no reliable information, and mixing large and small numbers beyond the 15-digit range is expected to degrade precision.

  **Guidance.** Sum with `.safeSum` (§16.7), not raw `+` and `-`, wherever terms of opposite sign may cancel; arithmetic written in a `>>` body is not protected. When the large terms are not exact in binary, trust the result only to about the 15th digit of the largest term, and choose the field's precision accordingly.

  🔮 **Exact sums.** Two stronger remedies were tested and are kept for a future version, should a use case need them. Rounding the compensated sum once to the finest decimal place among the operands — capped at the 15th digit of the largest operand not exact in binary — removes the representation error. Summing the operands' real numbers exactly with `BigInt` keeps every digit. Both need each operand's decimal place from its Tx type. Sorting by magnitude adds nothing once compensation is used, and rounding partial sums to significant digits does not help.
- **Rounded values are compared with `areEqual`, never `===`.** Beyond `10^22` the powers of ten used for the shift are inexact, so two roundings to the same decimal can differ in the last bit (`1.0099999999999999e-207` against `1.01e-207`). Rounding on set (§13.1) followed by `areEqual` gives equality to 15 significant digits.

`.R.n` maps to `fixedRound`; `.R:n` maps to `precisionRound`.

`safeAdd` and `safeSum` are **called deliberately by the author**, not injected by the compiler. Type checking stays static; numerical hygiene stays explicit; the compiler keeps one job. Inside a `>>` body, `.safeSum` and `.areEqual` are called as Tx islands (§16.7).

---

## 14. Conversions

### 14.1 The `to` and `from` namespaces ✅

`to` means *convert to*; `from` means *convert from*. Both namespaces are reserved.

| Member | Produces | Inherent? |
|---|---|---|
| `.to.$` | a string | **yes** — every trait has it |
| `to.$$` | Tx-md, put through the pipeline | no — declared by a trait that needs it |
| `to.X`, `X` a type | a value of type `X` — `.Q`'s `to.R` is to-real | no |
| `to.name`, any other name | whatever it declares — `to.array` | no |

**Only `.to.$` is inherent.** It is what a TxKeyRef in text renders: `This is my %.value` resolves through `.value.to.$`. Every other conversion is declared bare by the trait that offers it (`to.$$`, `to.R`, `to.array`) and referenced with `.` afterwards (§10.2). A `to.X` naming a known type must produce that type; any other name is free.

**`to.%` is removed.** A conversion names its target type explicitly. ❓ Examples in §12.6, §13.2, §14.3, §15.1 and §16 still use `to.%`, pending the new form for a primitive trait's value (§22 #49).

`from.*` is reserved for inbound conversions — `from.$` takes a string and produces the trait.

**Rendering in text.** `%.value` renders `.to.$` implicitly. Rendering `.to.$$` is always explicit — `%.tx-folder.to.$$` — because nothing tells the compiler which one is wanted (§22 #53).

### 14.2 `.$` versus `.$$` ✅

| | `%.keyref` | `.b{…}` dot-tags |
|---|---|---|
| `.$` | substituted | literal text |
| `.$$` | substituted | processed through the Tx-md pipeline |

A `to.$` or `to.$$` member with `>>` is a JavaScript body; without `>>` it is an interpolated template:

```
to.$: [x: %.x, y: %.y, z: %.z]
to.$: >> .to.%.toPrecision(3);
```

### 14.3 Defaults ✅

`.R:n` and `.R.n` supply `to.$` automatically, via `precisionRound` and `fixedRound`. So a trait using `to.%` with a `.R:3` default type gets three-significant-figure string output free.

### 14.4 Default types via `of` ✅ / ❓

```
Vec1 of .IR:
	x
	y
	z
	to.array: [] >> [.x, .y, .z]
	magnitude: >> Math.sqrt(.to.array.reduce((a, c) => a + c**2, 0))
```

Rules:

- `of` sets the default type; untyped fields receive it.
- The default default is `.$`.
- An interface as default type constrains what the concrete default may become.
- Once a concrete default type is set, it cannot be changed by an inheriting trait or a constraining field.
- `of` may also be used at a construction site: `.vec of .R:5: .t3.vec`. That does not change the source value's type; it produces a differently-typed value.
- 🔮 Default types are primitives only for now.

❓ **Which assignment sets it.** "The first field set" is order-dependent: a tuple sets `x` first, a named body might set `y` first, giving different default types for identical values. The safer rule is the first *declared* untyped field's assigned value, regardless of assignment order.

---

## 15. Validators and Statics

### 15.1 Shape ✅

```
Z:
	to.% in ._int52
	:#max in ._int52: 9_007_199_254_740_991
	:#min in ._int52: -9_007_199_254_740_991

URL:
	to.% in .$
	:_validator: val in .$ >>
		if (URL.canParse(val)) return;
		return Error("Invalid URL");
```

`:#` declares a static constant on the type record; `:_` declares a system hook. Both live on the type record, not on the instance, so neither survives erasure. All statics must be const.

### 15.2 Return, don't throw ✅

A validator returns an `.Error` or nothing. **Nothing means valid.** `.B ^ .Error` has a dead arm — `false` would have no meaning — so the two-state form is cleaner and extends naturally to returning several errors.

The reason is diagnostics, not language design: these run inside the compiler, in TypeScript, and a compiler wants to report every bad value in a block rather than halt on the first. Returning lets errors collect into the `{line, col, message}` list the CLI and the editor both consume.

### 15.3 Validators compile to flat ESM ✅

Not class members. Flat named exports, tree-shaken, imported only where actually used. Type information disappears; the validator functions remain callable.

### 15.4 Compile-time versus runtime ❓

Literal values validate at compile time and the constraint erases. A **computed** value cannot:

```
n in .N: >> .a - .b     // could be negative
```

Either computed values cannot carry constrained types, or validators survive into the output for those cases. Related: every number type wants `isValid` (integer, safe-integer, in-range) for the cases where static typing is lost — which is anywhere a multiline `>>` body declares its own variables.

---

## 16. Code: the `>>` Pipe

### 16.1 The rule ✅

`>>` separates typed Tx parameters from a JavaScript body. **Split on first `>>`** — the key head can never contain one, so JavaScript's right-shift operator in a body is safe.

```
add in .Z: a, b >> a + b;
```

- **Parameters are bare identifiers.** They occupy a different namespace from members, so a parameter named `a` does not shadow member `.a`.
- **Members are dot-referenced.** `.a`, `.vals.length`, `.f1.to.%`.
- Single-line bodies need no `return`; multiline bodies do.
- `;` terminators are optional. A line continuation is ` _` plus optional whitespace plus end of line.
- Multiline bodies use Tx indentation, not braces.

```
my-trait of .Z:
	a
	b
	c
	add: >>
		let tot = 0;
		tot += .a;
		tot += .b;
		tot += .c;
		return tot;
```

### 16.2 Backwards chain typing ✅

```
f1: a in .Z, b in .Z, c in .Z, s in .$ >> …
f2: a, b, c in .Z, s in .$ >> …            // same thing
```

A type applies backwards to every preceding untyped parameter until another `in` stops it. A parameter with no type anywhere defaults to `.$`, matching the rule for required trait fields.

### 16.3 Compilation of references ✅

Three rewrites, and they require a real JavaScript parser (acorn), not regex substitution, because `.name` may appear anywhere an expression can and member chains are arbitrary depth:

| Tx | JavaScript |
|---|---|
| `.x` where `x` is a value member | `x` |
| `.x` where `x` is a computed member | `x()` |
| `.sum(.a, .b, .c)` | `sum(a, b(), c())` |
| `to.%` / `to.$` / `to.$$` | `__tx_val()` / `__tx_str()` / `__tx_txmd()` |

Parameterless computed members are referenced without `()` in Tx and gain it in the output — which is what makes a value member and a computed member interchangeable to the consumer.

Arity is known at the point of use, because declaration order guarantees any `.name` encountered is already in the map. A single pass suffices within a block; composition triggers recompilation (§17.2).

The mangled names are needed because `%`, `$` and `$$` are not valid JavaScript identifiers.

### 16.4 Type checking inside bodies ✅ / 🔮

- **Single-expression bodies** are fully checked: a finite set of operators and known functions, mapped onto the Tx operation lattice via the acorn AST.
- **Multiline bodies are opaque.** Once a body declares its own variables, Tx types are gone. Trust the declared return type and check it at the boundary.

That buys most of the safety for a fraction of the work, and the scope can widen later.

### 16.5 Sandbox ✅

`>>` bodies run at build in a **Web Worker** with no DOM, no vault, no network, no Node and no clock. They are pure value computations — `join`, `reduce`, `toPrecision`, string building — so the constraint costs nothing.

This solves three problems at once:

- **Determinism.** No `Date.now()`, no `Math.random()`, no `fetch`, so the same source always builds the same output.
- **Non-termination.** A timeout cannot interrupt synchronous JavaScript on the main thread; a Worker can be terminated. (The diagnostic is coarser — which body, not which line. A step counter would give the line.)
- **Safety.** Obsidian desktop is Electron with Node integration, so `new Function` in the renderer is not sandboxed. A Worker is, on every platform, with no setting to explain to the user.

Compiler-side file reading is separate and permitted — a build step may read a `.csv` and hand the parsed rows to user code as data. The file is then a build input, hashed into the manifest, and determinism survives. `>>` bodies themselves never do I/O.

### 16.6 Imported JavaScript functions ❓

JavaScript (and perhaps TypeScript) functions can be imported so that any `>>` body in the project may call them. Importing is **explicit** — each function is named in a project file, not discovered — and where that declaration lives is not yet fixed (§22 #37). One project-wide set is enough, for the same reason global scope is simple (§3.3).

Imported functions run in the same Worker as the bodies that call them (§16.5), so they obey the same rules: pure, deterministic, no I/O. The `math.ts` helpers (`safeAdd`, `safeSum`, `fixedRound`, `precisionRound`, §13.8) are the first candidates. The editor offers imported functions, with their signatures, for completion and hover (§20).

### 16.7 Tx islands ✅ / ❓

A `>>` body is JavaScript, and Tx types are gone inside it (§16.4). Tx controls a body only at its boundary: the declared parameter types going in, and the declared return type coming out, checked against the value the body actually returns when it runs at build. The compiler does not analyse what happens in between.

Where a body needs TxData semantics in the middle — equality that respects precision, a sum whose cancellation is exactly zero — the author calls a **Tx island**: a dotted call the compiler resolves using the Tx types of its arguments.

**Dotted is Tx; bare is JavaScript.** Inside a body, a dotted name is a member (§16.3), a Tx island, or an imported function (§16.6); a bare name is plain JavaScript. An island reads its arguments' Tx types from their dotted references, so the JavaScript around it carries no Tx notation.

| Island | Does | Built on |
|---|---|---|
| `.areEqual(a, b)` | type-aware equality | `areEqual` (§13.8); interning (§18.2) |
| `.safeSum([…])` | compensated sum; a cancelled total is exactly `0` | `safeSumAll` (§13.8) |

```
x in .R:2: 3.314                          // rounds to 3.3
y in .R:3: 3.295                          // rounds to 3.30
b in .B: >> .areEqual(.x, .y);            // true

p in .R:1: 0.1
q in .R:1: 0.2
t in .R:1: >> .safeSum([.p, .q, -0.3]);   // exactly 0, not 5.55e-17
```

**`.areEqual` rules.**

- **Comparable types only.** Comparing different types is a compile error: `.URL` against `.$`, or `.R.n` against `.R:n`, which are different number domains — decimal places against significant digits.
- **`.R:a` against `.R:b` compares at the higher precision.** Both values were rounded when set (§13.1), so this compares the stored values within the relative epsilon: `.x` read at three digits is `3.30`, which equals `.y`.
- **Traits are equal when structurally identical** (§12.5): names, types, kinds and values. Interning makes that a reference comparison (§18.2), so two separately declared traits with the same structure — duck typing — are equal.
- **Projection does not count** (§12.5). If extra members were ignored, `{a, b}` would equal both `{a, b, c: 1}` and `{a, b, c: 2}`, which are unequal to each other, and equality would stop being transitive.

❓ An argument that is a JavaScript local — `el` in `.map((el) => …)` — has no Tx type to read; how an island treats it is open (§22 #55). Whether interning covers every type or only types that opt in is open (§22 #56). `math.ts` also exports `areEqual` and `safeSum` under the same names; precedence between islands and imported functions is open (§22 #57). Construction by tuple inside a body (`.Success(result)`) and `instanceof .Trait` are further island candidates, pending the union work (§12.1, §22 #46).

---

## 17. Compilation and Erasure

### 17.1 Partial evaluation ✅

Every `>>` body runs at build; every call site is statically known; functions are consumed rather than emitted. What survives is a tree of plain objects, primitives and arrays.

Two properties fall out. Immutability plus declaration order means the output is a **DAG with no cycles**, so serialization cannot loop. And every trait is constructed once from fixed values, which enables interning (§18).

### 17.2 When bodies compile ✅

**At full construction — the moment the last required field is filled.** Not at instantiation, because multi-stage construction means a field's kind can change more than once:

```
thing of .Z:
	a
	b
	c
	sum: >> .a + .b + .c
partial in .thing:
	.a: 42
x in .partial:
	.b: 42
	.c: >> .a + .b
```

If `sum` compiled at `partial`, `.c` was still unfilled. Compiling at `x` is correct, and it means `thing` and `partial` never emit JavaScript at all — they are type information only.

**Consequence:** forward references are legal *inside* a trait body (compilation is deferred until every field exists) but illegal at data-block level (nothing may reference what does not yet exist). Two different rules for the same-looking construct; both need stating, because the error message for the second must explain why the first is allowed.

### 17.3 Functions cannot cross the SSG boundary ✅

Props serialize to JSON, so a compile-time-evaluated function cannot reach the browser. A TxComponent taking a *function* prop — a plotting component evaluating `f(x)` as the user drags — is **out of scope**. That behaviour belongs in the component's own TypeScript.

### 17.4 Freezing ✅

`Object.freeze` on every interned node makes immutability real and is cheap. The browser side receives fresh objects from `JSON.parse`, so the freeze never crosses the wire — it is a compiler-side invariant.

---

## 18. Identity and Interning

### 18.1 Two stages ✅

| Stage | Hashes | Gives |
|---|---|---|
| **open types** | field names, types, kinds, values, `>>` source | structural type identity, duck typing |
| **constructed values** | the constructed content, including compiled bodies | value interning |

### 18.2 Interning ✅

Construction is deterministic and values are immutable, so identical values share one object. `x in .Foo: 42` and `y in .Foo: 42` are **reference-equal**. Reference equality is structural equality; deep comparison never happens; a `%.graph1-props` used across fifty pages costs one object.

"Instance" is misleading language for these — they are closer to interned constants, like string literals in C.

### 18.3 Cache key ❓

`(type, values)` or `(values)` alone. After erasure, two traits differing only in composition order or precision tag emit identical objects and could share one. The only thing that could force the type into the key is a surviving union tag, and none survives erasure (§12.1).

---

## 19. The Bridge to TxDoc and TxGen

### 19.1 What TxDoc supplies ✅

Fixed in the TxDoc spec, inherited here:

1. **Phase 0 fence claiming** — `tx-d` blocks captured with line range and removed from the tree.
2. **The TxToken scanner** — one pass over text nodes finding `%name` and `%.name`, with a pluggable resolver. TxDoc wires TxSettings; TxData adds the TxKeyRef resolver behind it.
3. **Lexical rules** — assignment colon, `[\w-]+` names, ` :: `, `|` as OR, `^` as XOR, `%` opening keys, unquoted strings.

### 19.2 Props across the SSG boundary ✅

| Target | How props reach the component |
|---|---|
| Obsidian (future plugin) | the plugin holds the object in memory — `createRoot` |
| Website, build | the same object, in Node — `renderToString` |
| Website, browser | a JSON script block; `JSON.parse` on hydration |

**TxKeyRefs resolve before serialization.** `latex: n = %.n` ships as `"n = 42"`. The browser receives plain data and needs no resolver, so **no TxData machinery exists in the client bundle.** Types erase at the JSON boundary; checking happened at build.

**How props are supplied** — named first-level TxAttributes, or the whole structure with `%props:`, never both, and no spread — is TxDoc §15.4. React components are TypeScript and lie entirely outside the Tx domain: they receive only erased JavaScript data or JSON.

❓ Three declarations of one shape must agree — the TypeScript props interface, the Tx trait, and `TxConfig.ts`. Tx validates note values against the trait; nothing validates the trait against TypeScript.

### 19.3 TxGen types ❌

```
TxMeta:
	title in .$?
	desc in .$$?
	date in .Date?
	tags in .$[]?
	draft in .B: .false

#tx-meta in .TxMeta?
```

The folder union — `TxFolder-Head.txd` with `^ITxFolder`, its three arms and `tx-folder` — is the worked example in §11.5, shared with TxGen §8.

```
TxEntry:
	filename in .$      // raw, with Dewey prefix
	order in .$         // the prefix, for sorting
	part in .N?
	index in .N         // ordinal after the canonical sort
	title in .$
	slug in .$
	date in .Date?
	tx-meta in .TxMeta?
```

Dates are ISO 8601 (`2026-09-25`) — unambiguous, sorts as a string, parses everywhere. ❓ `.Date` is a new system type: presumably a flattened `.$` with a validator, like `.URL`.

❓ Whether a folder with no `_meta.md` gets no wrapper, or the head's default arm (TxGen §20 #30).

### 19.4 Reentrancy ✅

A `.$$` value goes through the Tx-md pipeline, which resolves against `TxConfig`. So TxData can instantiate a TxComponent, and a folder wrapper is an island born from metadata rather than from a `.md` file. Pipeline order: TxData → Tx-md → TxConfig → island.

✅ A `.$$` value may contain a TxComponent — the folder union depends on it (§11.5).

### 19.5 Standalone use ✅

`tx data --out json` compiles a `.txd` file to JSON or an ES module. That makes TxData a typed, human-editable data format independent of the document pipeline, which is worth having on its own.

---

## 20. Diagnostics and Editor Tooling

### 20.1 Default rule ✅

Inherited from TxDoc: **an unresolved reference is left as written.** `%.unknown` renders as `%.unknown`. No throw, no placeholder. The author sees it in the preview.

That is deliberately weak, and it is why the diagnostics layer matters.

### 20.2 What the compiler must report ✅

Every parse and resolve step returns `{line, col, message}` rather than throwing. The high-value messages:

| Error | Message shape |
|---|---|
| unfilled required field | `.Bay` is not constructable: `.a` (from `.Foo` via `.Baz`) is unfilled |
| flatten collision | `.a` flattened from both `.Foo` and `.Bar` |
| forward reference | `.n` is not yet defined |
| re-declaration | `.x` is already declared |
| double definition | `.m` is defined twice in this trait |
| closure violation | `.N` output cannot use subtraction |
| validator failure | the validator's own `Error` message, positioned |
| JavaScript syntax | from acorn, positioned |

The unfilled-field message is the one that makes multi-stage construction usable — a reader four traits down cannot tell locally whether a reference constructs or errors, so the compiler must say what is missing and where it came from.

### 20.3 The VS Code extension ✅ decided / ❌ not built

The editor target is a **VS Code extension** giving code colouring, **autocomplete**, and **hover information over fields and trait types**, for Tx-md text, `tx-d` fences and `.txd` files. Autocomplete and hover are first-class, not deferred. They are what make multi-stage construction usable: whether `in .T` awaits a definition or constructs immediately cannot be seen on the line (§8.2).

The Obsidian plugin is a future version (TxDoc §16.6). Obsidian stays the authoring tool; `tx-d` fences are edited in VS Code with the Tx extension; the result is viewed by building the site or running it in dev.

### 20.4 Triggers: `.` and `%` only ✅

Every reference in Tx carries a sigil. Dot-tags, trait types and field references begin with `.`; TxAttributes, TxSettings and key attributes begin with `%`; TxKeyRefs begin with `%.`. Nothing in prose begins a word with either character — which is what makes dot-tags safe in the first place. So completion fires **only when `.` or `%` is typed at the start of a token**:

- **In Tx-md text:** after line start, whitespace, `{` or `(`; and `.` directly after `%`. Never after a letter, digit or another `.`, so `end.`, `3.14`, `...` and `50%` never trigger. Never on the second `%` of `%%`.
- **Inside `tx-d` and `.txd`:** the same, plus `.` after a name in a member chain (`.f1.to.$`, `.Foo.a`).

Contrast languages whose names are bare words, where every keystroke must be treated as a possible completion. VS Code's letter-by-letter quick suggestions are switched off for the Tx language IDs. Ctrl+Space still works anywhere, and the server works out the context from a half-typed `.nam|` or `%nam|`.

### 20.5 What completion offers ✅

| Cursor after | Offers |
|---|---|
| `.` at line start in Tx-md text | TxHeading and TxBlock tags |
| `.` mid-line in Tx-md text | TxInline tags |
| `%` after a TxElement's content | its TxAttributes; for a TxComponent, the first-level fields of its props trait, plus `%props` |
| `%` on a list item line | TxSettings (`%ol-A`, `%ul-C`, …) |
| `%.` in Tx-md text, or in a `.$` / `.$$` value | fields of the document's module trait |
| `.` after `in`, `add` or `of` | trait types — system types (Appendix B) and traits in scope |
| `.` after `on` | a base trait first, then only `^` interfaces (§9.1) |
| `.` after `as` | only the arms of that field's XOR set (§11.4) |
| `.` at the start of a line in a construction body | members of the trait not yet defined (§7.2) |
| `.` after a name | that value's or trait's members |
| `%` in a `tx-d` key head | key attributes: `%;`, `%,`, `%sp`, `%<` |
| `.` in a `>>` body | members, Tx islands (§16.7) and imported JavaScript functions (§16.6) |

Tag names come from the `TxConfig.ts` tag tables. How the editor reads them without executing component code is open (§22 #40).

### 20.6 Scope: declaration order keeps the list small ✅

Because nothing may reference what does not yet exist (§3.4), the candidates at any point in the data are exactly what is **above, at data-block level**: global scope (the global head and every TxComponent props trait) first, then earlier fences in document order, then earlier fields in the same fence. There are no cycles to guard against and no forward declarations to index, so the candidate list is always small and already known when `.` is typed.

Two places see more:

- **Tx-md text.** Data blocks are processed before any text, so `%.` in text offers every field in every fence of the document, above or below. Here typing `%.` offers `value`:

````
My value is %.value

```tx-d
value: 42
```
````

- **Inside a trait body.** Forward references to the trait's own members are legal (§17.2), so completion inside a body offers all of the trait's members, inherited ones included.

### 20.7 Hover ✅

| Over | Shows |
|---|---|
| a field | kind (§6), type, literal value if any, and origin — the trait it was inherited or flattened from (§12.3) |
| a construction `x in .T` | whether it constructs now or awaits definition, and which required fields are unfilled with where each came from — the same content as the unfilled-field diagnostic (§20.2) |
| a trait type | its fields with kinds and types, its interfaces, its default type |
| a TxAttribute on a TxComponent | the props-trait field it sets |
| an imported function | its signature |

### 20.8 Colouring ✅

A TextMate grammar gives colour immediately, before the language server starts — including inside `tx-d` fences in markdown files, by grammar injection. Semantic tokens from the language server then refine it where only the parser knows the answer: a trait type versus a field, a declaration versus a definition.

### 20.9 Parser architecture ❓

TextMate alone is not sufficient: hover and completion need an error-tolerant concrete syntax tree, updated incrementally as the author types. What is fixed:

- **One library.** The compiler is shared by the extension, the build and `tx check` (§21.1). The editor does not get a second parser.
- **Two levels.** A *structural* level — lines, tab indentation, the first-match `: ` split, key heads, raw value spans, comments, the `:` record terminator — is context-free. A *type-directed* level — delimiters, tuple versus named construction, array flattening by rank, whether a value-body line is a key head (§22 #2) — needs the types in scope, so it lives in the semantic layer.
- **Four languages meet.** Tx-md text with `%.` TxKeyRefs; TxData; `>>` bodies, which become JavaScript only after the acorn rewrite (§16.3), so JavaScript completion inside a body works on the rewritten source through a source map; and `.$$` values, which are Tx-md again.
- **Regions are simple.** A `tx-d` fence, a `.txd` file and the fence in `_meta.md` all start at column 0, byte for byte, so one TxData entry point parses all three with only a line offset.

Open: the parser technology — Tree-sitter, Lezer, or a hand-written incremental parser (§22 #39).

### 20.10 Tooling order

1. **Position-accurate diagnostics** — unavoidable; everything else is a shell over them.
2. **`tx check <glob>`** — nearly free once 1 exists.
3. **The VS Code extension** — TextMate grammar first, then a language server with diagnostics, hover and completion.

An honest limit: roughly two-thirds of real typos are catchable. `.R.3` versus `.R:3` is not, because both are valid; nor is a comment describing the wrong type.

---

## 21. Implementation Plan

### 21.1 Order

1. **Lexer and key-head parser.** Assignment colon, names, kinds, types, delimiters, `//`. Diagnostics from the first line of code.
2. **The type record and trait table.** Declaration, definition, one-shot rules, origin tracking.
3. **Construction.** Named body, tuple, auto-construction, unfilled-field diagnostics.
4. **Composition.** `in`, `on`, `add`, `of`, flattening, collision errors.
5. **Containers.** Arrays, delimiters, the `:` record terminator.
6. **The number lattice.** Types, interfaces, closure checks, `to.$` defaults via `math.ts`.
7. **`>>` bodies.** Acorn rewrite, Worker evaluation, single-expression checking.
8. **Interning and erasure.** Emit JSON and ES modules.
9. **TxKeyRef resolution** into TxDoc text and into component props.
10. **Interfaces, unions, `as`.** Then TxGen's `ITxFolder` / `TxMeta` / `TxEntry`.
11. **Validators and statics.**
12. **`tx check`, then the VS Code extension** — TextMate grammar, then the language server with diagnostics, hover and completion (§20).

The compiler is a **library**; the CLI is a thin wrapper. The VS Code extension, the Next.js build and, later, the Obsidian plugin all need the same entry points.

### 21.2 What a minimum viable TxData is

Steps 1–5 plus 8 and 9. That gives typed props and page metadata — enough for a working documentation site. Numbers, bodies, interfaces and unions can follow.

---

## 22. Open Items Register

Numbered independently of the TxDoc register (TxDoc §18).

Status legend: ✅ resolved · 🟡 partially resolved · 🟠 unresolved.

| # | Item | Resolution | Status |
|---|---|---|---|
| 1 | Fence name `tx-d` vs `tx-data` | **`tx-d`** | ✅ |
| 2 | Key-head vs member-body discrimination for the `: ` splitter | proposed: try key-head shape first, else treat as content; also fixes the editor's structural grammar (§20.9) | 🟡 |
| 3 | Trailing `//` comments, or whole-line only | whole-line only is the safest reading | 🟠 |
| 4 | `%%` comments inside `.$` / `.$$` values | 🔮 deferred | 🟠 |
| 5 | `#` (const field) vs `:#` (static constant) visual collision | undecided | 🟠 |
| 6 | Interface "required of implementers" marker | none needed: an interface declares the member without a value, like any required field (§10.2) | ✅ |
| 7 | Flatten declared *and* at inheritance (`Foo %<` + `add .Foo %<`) | redundant or error | 🟠 |
| 8 | Variance: does `in .T` accept a descendant of `.T`? | `in` is "closed", which suggests invariance | 🟠 |
| 9 | Parameter shadowing a member name | forbid or accept explicitly | 🟠 |
| 10 | Array flattening with other required fields present | rank does not settle the tuple case (§8.5); array last, or named form required | 🟠 |
| 11 | Spread vs pass for nested arrays | settled by rank: an item of the element type is a member, an item of the array type is flattened (§8.5) | ✅ |
| 12 | Union narrowing syntax (`is`?) and exhaustiveness | `as` in the Key Area, `instanceof .Arm` in bodies; exhaustiveness from `^` members, which every arm must implement (§11.4, §11.6) | ✅ |
| 13 | Optional narrowing: does `.none` coerce in arithmetic, or error? | erroring is consistent | 🟡 |
| 14 | `has()` all-of or any-of on OR sets | undecided | 🟠 |
| 15 | Projection implicit or marked | implicit can swallow a wrong argument | 🟠 |
| 16 | Interval expressions in type position | type-level evaluation appears nowhere else | 🟠 |
| 17 | `.Q` codegen: operator rewriting and gcd normalisation | mitigate by widening `.Q` to `.R` on entry | 🟡 |
| 18 | Integer overflow beyond `2^53` | surfaced only at `to.$`; accepted, not protection | 🟡 |
| 19 | Mixed precision join (`.R:3` + `.R.2`) | lowest wins; exact rule needs stating | 🟡 |
| 20 | Validators at compile time vs surviving to runtime | computed values break compile-only | 🟠 |
| 21 | `to.X` namespace: reserved for type conversions or free | `to` and `from` are reserved; a type-named member must produce that type; other names are free; only `.to.$` is inherent (§14.1) | ✅ |
| 22 | Default type from first *assigned* vs first *declared* field | first *declared* is the safer rule | 🟡 |
| 23 | Hash-cons key: `(type, values)` or `(values)` | undecided | 🟠 |
| 24 | `.Date` system type definition | presumably a flattened `.$` with a validator | 🟡 |
| 25 | Required field in a global head — blast radius | a folder without `_meta.md` keeps the head's default `tx-folder` — the default landing page (§11.5, TxGen §8.1) | ✅ |
| 26 | May a `.$$` value contain a TxComponent? | yes — the folder union's `.to.$$` bodies do (§11.5, TxGen §8.2) | ✅ |
| 27 | Tx trait vs TypeScript props drift | props are rewritten as a TxData trait; nothing checks it against the TypeScript interface | 🟠 |
| 28 | Function props across the SSG boundary | out of scope by decision | ✅ |
| 29 | `0^0` — JS gives 1; Tx guard must be emitted if it disagrees | undecided | 🟠 |
| 30 | Generics beyond `.Type<I>` | 🔮 | 🟠 |
| 31 | Function overloads | 🔮 — needs argument inference and tie-breaking | 🟠 |
| 32 | Runtime `instanceof` — `%runtime` (§12.7) | `$type` string tag, `isTrait`, `Symbol.hasInstance`; union arms always tagged, never stripped (§11.6); open: subtype semantics (#60); Tx-level reflection deferred to TxCode | 🟡 |
| 33 | Mutability | 🔮 TxCode | 🟠 |
| 34 | ESM module traits | 🔮 | 🟠 |
| 35 | Default types as trait types, not just primitives | 🔮 | 🟠 |
| 36 | `BigInt`, `.C` complex numbers | 🔮 | 🟠 |
| 37 | Imported JavaScript functions for `>>` bodies (§16.6) | explicit import, one project-wide set, run in the Worker; where the import declaration lives is not fixed; TypeScript "perhaps" | 🟡 |
| 38 | Where TxComponent props traits live | in `TxData-Head.txd`, or `.txd` files it imports (needs a `.txd` import mechanism); either way global (§3.3) | 🟠 |
| 39 | Editor parser technology | Tree-sitter, Lezer, or hand-written incremental (§20.9); Lezer's CodeMirror advantage is no longer near-term with the Obsidian plugin deferred | 🟠 |
| 40 | How the editor reads tag names from `TxConfig.ts` without executing component code | static read with the TypeScript compiler API, or a manifest written by `tx check` | 🟠 |
| 41 | Mixing members and array references when filling a 1-D array | allowed (§8.5) | ✅ |
| 42 | Spread operator | none (§8.6, TxDoc §15.4) | ✅ |
| 43 | Completion triggers | only `.` and `%` at the start of a token (§20.4) | ✅ |
| 44 | Global scope for completion and resolution | global head(s) plus every props trait; a name defined twice across global files is an error; depends on #38 | 🟡 |
| 45 | Global head defines a field that a fence then redefines (`tx-folder`, §11.5) | heads are base layers; each file may override a top-level field once (§3.2) | ✅ |
| 46 | A union value itself passed outside the compiler | every instance of an object arm carries `$type`, in and out (§11.6, §12.1) | ✅ |
| 47 | Type-name discriminator | the arm name, selected with `as` and emitted as `$type`; no discriminant field is declared (§11.6) | ✅ |
| 48 | Placement of `#` (const) | left-most on the key (`#to.$$`) or next to the type; never written on a reference (§6.1) | 🟡 |
| 49 | What replaces `to.%` as a primitive trait's value slot | needed for §12.2 flattening, `.Z`/`.N` definitions (§12.6, §15.1), `sum` (§13.2) and codegen (§16); `.%` in §12.6 also clashes with the enum-member type | 🟠 |
| 50 | `trait-add-mode: Flattened` | how to ask for a namespaced `add` at one site; collisions become more likely (§3.5) | 🟠 |
| 51 | Module settings (§3.5) | a head field with a default, overridden once per file; `trait-add-mode` is the first | ✅ |
| 52 | String, enum and key/value XOR sets (§11.2) | `.$^{}` members are bare strings; `.%^{}` members are dot-referenced; `.%:.T^{}` members have `.key` and `.value` | ✅ |
| 53 | TxKeyRef rendering in text | implicit `.to.$`; `.to.$$` only when written explicitly (`%.tx-folder.to.$$`) (§14.1) | 🟡 |
| 54 | Precision cap for `.R:n` / `.R.n` | 14 digits, with the 15th deciding; exact for every real number of up to 15 significant digits (§13.1, §13.8) | ✅ |
| 55 | Tx-island arguments that are JavaScript locals | no Tx type to read from a bare local (§16.7) | 🟠 |
| 56 | Interning for every type, or opt-in (`%Hash`) | equality is structural either way; interning changes only its cost (§16.7, §18) | 🟠 |
| 57 | Island names versus imported functions | `math.ts` exports `areEqual` and `safeSum` under the island names; precedence not fixed (§16.6, §16.7) | 🟠 |
| 58 | Cancellation in sums | `safeSum` (Neumaier) recovers the additions' own error; the operands' binary error and digits below the largest term's 15th digit remain, documented as expected degradation; exact sums (grid rounding, `BigInt`) kept for a future version (§13.8) | ✅ |
| 59 | Abstract members with parameters beyond `.%` | values they need are required fields for now; parameterised members with routers are 🔮 TxCode (§10.2, §11.6) | 🟠 |
| 60 | `instanceof` for nested and sub-unions | e.g. `instanceof .Response` true for any of its arms (§11.6) | 🟠 |
| 61 | Sub-unions with `as` and `del` | `.PaymentMethod as .CreditCard .PayPal`, `.PaymentMethod del .Crypto`; telling a sub-union type declaration from a field declaration (§11.6) | 🟠 |
| 62 | `instanceof` hook in ES-module output | (§11.6) | 🟠 |
| 63 | Routers for abstract members | 🔮 TxCode — needs typed code blocks and overloads (#31) (§11.6) | 🟠 |
| 64 | `.T?!` throwable result | 🔮 TxCode (§11.1) | 🟠 |
| 65 | Interfaces without abstract members | a user-defined interface has at least one `^` member; the system numeric interfaces `.IN`–`.IR` are the exception (§10.1) | ✅ |

---

## 23. Design Notes

Reasoning worth not relosing.

1. **A fence, not a custom syntax.** `tx-d` as a code fence gives Phase 0 a claimable node with no micromark extension, preserves blank lines, survives every later phase untouched, and renders inert in Obsidian. `%%data:` was abandoned because Obsidian uses `%%` for comments.
2. **The `: ` rule is guaranteed, not conventional.** No key-head token can contain a spaced colon, because names are `[\w-]+` and types have no internal spaces. That is what makes first-match splitting safe.
3. **Declaration order kills cycles structurally.** Detection is unnecessary if forward references are illegal — which also gives the compiler a simple single pass within a block.
4. **A trait that inherits is a new set.** That is the single sentence that makes one-shot definition and multi-stage overriding stop looking contradictory.
5. **Values are part of the type signature.** This is what distinguishes Tx traits from C# classes and TypeScript interfaces, and it is what lets `.TxBook` and `.TxBlog` be different types despite identical field shapes.
6. **`in` closes, `on` opens.** Two keywords earn their place only because `in` is invariant — which then makes an interface parameter the way to accept a family of types.
7. **Compile at full construction, not instantiation.** A field's kind can change more than once during multi-stage composition, and a `>>` body's emitted JavaScript depends on it.
8. **Interning is free correctness.** Immutability plus deterministic construction means reference equality *is* structural equality.
9. **The Worker solves three problems with one mechanism** — determinism, non-termination, and sandboxing on Electron. Reach for it early rather than adding a setting.
10. **Diagnostics are the product.** The editor extension is a shell over a parser that reports positions. Build the parser's error paths first; `tx check`, colouring, hover and completion are then shells over the same library.
11. **Numerical hygiene stays explicit.** `safeAdd` is called by the author, not injected by the compiler, so the compiler keeps one job and the emitted JavaScript stays readable.
12. **`Number.EPSILON` is base-2.** `2 × EPSILON` scaled by decade is what matches 15 reliable decimal digits, and `toFixed` rounds the binary value rather than the decimal the author wrote.
13. **Sigils make autocomplete cheap.** Every reference begins with `.` or `%`, and nothing in prose begins a word with either, so completion fires only on those keys at the start of a token. Declaration order then makes the candidate list exactly what is above — small, and already known.
14. **Rank replaces spread.** Several arrays handed to a 1-D field can only mean *combine them*; one `%props:` reference can only mean *this is the props*. The use case is clear, so no operator is needed.

---

## Appendix A — Keyword and Operator Reference

| Token | Meaning |
|---|---|
| `in` | constrain to one closed type |
| `on` | single inheritance; base first, then interfaces |
| `add` | mixin composition |
| `as` | select one arm of a type XOR set |
| `of` | set default member type |
| `>>` | separate Tx parameters from a JavaScript body |
| `: ` / `:`+EOL | assignment |
| `//` | line comment |
| `%<` | flatten |
| `^Name` | interface / abstract declaration |
| `#name` | const field |
| `:#name` | static constant |
| `:_name` | system hook |
| `.T[]` | array |
| `.T^{}` | XOR set |
| `.T\|{}` | OR set |
| `.T?` | optional |
| `.T:n` | significant digits |
| `.T.n` | decimal places |
| ` :: ` | string array separator |
| `, ` | numeric array separator |
| `_` | numeric digit grouping |
| `:` alone on a line | array record terminator |
| `a .. b`, `a <.. b`, `a ..< b`, `a <..< b` | intervals |
| `.none` / `.some` | null / not-null |
| `.key` / `.value` | name and value of a key/value enum member (§11.2) |

## Appendix B — System Types

| Type | Notes |
|---|---|
| `.$` | string |
| `.$$` | Tx-md rich text |
| `.B` | boolean; `.true`, `.false` |
| `._int52` | compiler-level safe integer |
| `.N` | naturals, `1 <.. .Z:max` |
| `.W` | whole numbers, `0 <.. .Z:max` |
| `.Z` | integers, `:#min` to `:#max` |
| `.Q` | rationals — two `.Z`, cannot flatten |
| `.R` | reals; `.R:n` significant, `.R.n` fixed |
| `.Hex` | 32-bit integer written with a `0x` prefix |
| `.%` | enum member — the member type of `.%^{}` and `.%:.T^{}` sets (§11.2); as a parameter name, the receiver (`this`) of an abstract member (§10.2) |
| `.IN .IW .IZ .IQ .IR` | numeric interfaces — type-preserving bounds; system-defined, with no abstract members (§10.1) |
| `.NaN` | folded into `.R` |
| `.none` | the single null |
| `.Error` | typed error with `message` as an ordinary field; validator return; the error arm of `.T??` (§11.1) |
| `.Type` / `.Type<I>` | the type of types; `<I>` is a system form |
| `.Date` ❓ | ISO 8601, flattened `.$` with a validator |
| `.URL` ❓ | flattened `.$` with a validator |
| `.CSSLength` ❓ | flattened `.$` with a validator |
| `.regex` ❓ | flattened `.$` with a validator |

## Appendix C — Worked Examples

**Document data and a keyref**

````
The number is %.n

```tx-d
n: 42
str in .$$: The .b{number} is %.n
```
````

**Vectors with a default type and conversions**

```
Vec3 of .IR:
	x
	y
	z
	to.array: [] >> [.x, .y, .z]
	magnitude: >> Math.sqrt(.to.array.reduce((a, c) => a + c**2, 0))
	to.$: [x: %.x, y: %.y, z: %.z]

v1 in .Vec3: 2.220, 33.3, 44      // implicit .R:4 from the first value
```

**Multi-stage construction**

```
Foo %<:
	#a in .Z
	c in .Z
Bar add .Foo:
	.a: 84
x in .Bar: 23                     // .a = 84 (frozen), .c = 23
```

**A flag set**

```
FileAccess in .$:.W|{}:
	read
	write
	exe

f1 in .FileAccess: .read | .write
b1 in .B: >> .f1.has(.read)
```

**A discriminated union**

```
TxFolders in .Type<.ITxFolder>^{}:
	.TxBook
	.TxBlog

.tx-folder as .TxBook:
	.content:
		This is the intro to my book.
```

**Component props** — the whole structure with `%props:` (named first-level TxAttributes are the alternative, TxDoc §15.4)

````
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

> **Fence convention.** CommonMark requires a closing fence at least as long as its opening fence, so a four-backtick fence may contain any three-backtick fence. Examples showing a `tx-d` block are therefore wrapped in four backticks. Content inside a fence is never indented for the fence's sake — it is preserved byte for byte, and the opening-fence stripping rule counts spaces only, so Tx's tabs always survive intact.
