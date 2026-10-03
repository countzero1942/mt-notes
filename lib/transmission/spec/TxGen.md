# TxGen

**Transmission (Tx) — generating a document tree into a static site**

*Drafted 28 September 2026.* This document specifies TxGen, one of the specs that make up the Spec (TxDoc §1). Nothing in it is implemented; every section is a target. §20 records what is open. TxCode is a future version with no dependency on this one.

**Revision 28 September 2026.** TxComponent security is deferred to a future public version (§13). The VS Code extension is the editor target and the Obsidian plugin a future version (§16). The open-items register gains a status column (§20).

**Revision 29 September 2026.** Folder wrappers rewritten around the TxFolder union and `TxFolder-Head.txd`, with the generated landing page (§8.1, §8.2; same example as TxData §11.5). Deep links into a wrapper by URL parameters (§4.3).

**Revision 3 October 2026.** In `TxFolder-Head.txd`, `^to.$$` is an abstract member, defined by every folder type (§8; TxData §10.2).

**Status markers**

| Marker | Meaning |
|---|---|
| ✅ | Settled — design fixed, safe to build against |
| ❌ | Designed, not built |
| ❓ | Open — see §20 |
| 🔮 | Deliberately deferred |

In the §20 Status column: ✅ resolved · 🟡 partially resolved · 🟠 unresolved.

---

## Table of Contents

1. [Scope](#1-scope)
2. [Terminology](#2-terminology)
3. [The Source Tree](#3-the-source-tree)
4. [Slugs and Ordering](#4-slugs-and-ordering)
5. [The Build Passes](#5-the-build-passes)
6. [Link Resolution](#6-link-resolution)
7. [Images and Assets](#7-images-and-assets)
8. [Folder Wrappers](#8-folder-wrappers)
9. [Document Metadata](#9-document-metadata)
10. [Route Generation in a Host](#10-route-generation-in-a-host)
11. [The Island Build](#11-the-island-build)
12. [Component Distribution](#12-component-distribution)
13. [Security](#13-security)
14. [Incremental Builds](#14-incremental-builds)
15. [The CLI](#15-the-cli)
16. [Other Consumers](#16-other-consumers)
17. [Hosting](#17-hosting)
18. [Diagnostics](#18-diagnostics)
19. [Implementation Plan](#19-implementation-plan)
20. [Open Items Register](#20-open-items-register)
21. [Design Notes](#21-design-notes)

Appendices: A. Output Layout · B. Config Reference · C. Worked Example

---

## 1. Scope

TxGen turns a folder tree of Tx-md documents into a static website: HTML files at stable URLs, mirrored images, and the JavaScript that brings TxComponents to life.

**In scope:** source tree layout, slug derivation, sort order, traversal, wikilink and image resolution, folder wrapper components, route generation in a host framework, the island build (manifest, bundling, client runtime), component distribution, incremental rebuild, the CLI.

**Out of scope:** the Tx-md pipeline itself (TxDoc), the data language (TxData), anything a TxComponent does at runtime in its own code.

**Design goals**

1. **Deterministic output.** The same tree always produces the same site. A slug is a pure function of a file path.
2. **No resolution pass for links.** Because slugs are computable without cross-file lookup, link rewriting needs only a cheap directory index, not a render of the target.
3. **Obsidian is the authoring tool.** Everything TxGen asks of an author is something Obsidian already does well — rename a file, drag it in the sidebar, write a wikilink. Without a Tx plugin, dot-tags and `tx-d` fences simply show unprocessed there, which is acceptable; `tx-d` fences are edited in VS Code with the Tx extension (§16.1).
4. **The host framework is a thin shell.** Next.js or Astro run the pipeline and write files. Everything island-related belongs to Tx and is identical across hosts.
5. **Static output, no server.** The result is a folder of files. Whatever else the host site does is outside Tx.

---

## 2. Terminology

| Term | Meaning |
|---|---|
| **vault** | The source tree of `.md` documents. An Obsidian vault, or a folder that looks like one. |
| **slug** | One URL-safe path segment derived from a filename. |
| **route** | The full URL path — `/docs/my-book/01-01-subject-a`. |
| **Dewey prefix** | The numeric prefix on a filename that fixes sort order: `01-01`. |
| **part** | The segment of a Dewey prefix before the hyphen, grouping chapters. |
| **TxFolder** | A folder with a `_meta.md` declaring a wrapper component. |
| **wrapper** | The TxComponent that renders a folder's landing page. |
| **TxEntry** | One child's metadata, passed to a wrapper. |
| **island** | A rendered TxComponent — a live region in otherwise static HTML. |
| **manifest** | The build's record of components: source, module, hash, inputs, styles. |
| **host project** | The Next.js or Astro app that runs TxGen. |

---

## 3. The Source Tree

### 3.1 The vault may live anywhere ✅

Inside the host project or outside it, and **not** inside `public/`.

`public/` is copied verbatim into the build output, so a vault placed there would serve raw markdown — dot-tags, `tx-d` fences and all — at a public URL. Markdown is read at build time by Node, from wherever it sits; only images need to reach the browser.

```
mt-notes/
	content/docs/            ← the vault (or an absolute path outside the repo)
	lib/transmission/
	public/docs/             ← generated image mirror only
	app/docs/[...slug]/      ← one route file
```

### 3.2 Excluded files ✅

**A file or folder whose name begins with `_` is excluded from routing.** Specific names are then *recognised* by the walker rather than ignored:

| Name | Role |
|---|---|
| `_meta.md` | folder metadata and wrapper declaration (§8) |
| `_images/` | image folder, mirrored but never routed (§7) |

That carve-out is necessary: the `_` rule and the need for system files inside the tree would otherwise contradict each other.

In `_meta.md`, text outside the `tx-d` fence is ignored — no error, so the author can keep notes to themselves in the file. ❓ A linter could flag it later.

### 3.3 Tabs ✅

Tx-md indentation is tab-only, so the vault's editor must use real tabs. This is an Obsidian setting and a VSCode setting, and getting it wrong breaks TxBlocks silently.

---

## 4. Slugs and Ordering

### 4.1 Dewey prefixes ✅

Files are ordered by a numeric prefix on the filename, sorted alphabetically:

```
/MyVault/MyBook/01-01 Subject A.md
/MyVault/MyBook/01-01b Subject B.md
/MyVault/MyBook/01-02 Subject C.md
/MyVault/MyBook/02-01 Subject D.md
```

The prefix ends at the first whitespace. Before the hyphen is the **part**; after it, the chapter. A letter suffix (`01b`) inserts between numbers.

**Why not an explicit index.** An ordering list in `_meta.md` means every insertion is an edit in two places, and the file order in Obsidian's sidebar stops matching the published order. A prefix is renamed in place — click the title, type — and Obsidian shows the result immediately. It is the library shelving problem, solved the way libraries solved it.

### 4.2 Sorting rules ✅

Three things must be explicit, because the defaults are wrong:

- **Never `readdir` order.** It is filesystem-dependent. TxGen sorts.
- **Code-unit comparison, never `localeCompare`.** Locale collation varies by platform and would make builds non-reproducible.
- **Consistent prefix width.** `01`…`99` sorts correctly; adding `100` puts it before `99` because `"1" < "9"`. Either commit to a width or use a natural sort that reads digit runs as numbers. A warning on inconsistent widths within a folder catches it early.

Minor: `02B` sorts before `02b` in code units, so letter suffixes should be lowercase by convention.

### 4.3 The slug keeps the prefix ✅

```
/MyVault/MyBook/01-01 Subject A.md   →   /docs/my-book/01-01-subject-a
```

This is the decision everything else rests on. **The slug is a pure function of the file path** — no `.title` lookup, no cross-file resolution, no ordering dependency. That is what allows a link to be rewritten without rendering or even reading its target.

`.title` affects display only. A title edit is therefore free; renaming a file is the deliberate act that changes a URL, and that is also when Obsidian offers to update wikilinks.

**Consequence:** renumbering a file changes its URL. Obsidian's rename handling fixes internal links; external bookmarks break. Documented, not solved.

**The prefix stays in the URL, and that is fine.** Because filename and slug path are deterministic, any page can be linked directly — a book chapter from anywhere, outside its book wrapper. A link can also open a chapter *inside* its wrapper: link to the book's landing page with URL parameters (for example `/docs/my-book?chapter=01-01b-subject-b`), which the wrapper reads. Parameter names are the wrapper's own business.

### 4.4 Slugification ✅

Lowercase, spaces and underscores to hyphens, accents folded, non-alphanumerics dropped. Hyphens throughout rather than underscores — Google treats hyphens as word separators and underscores as joiners, and a mixed `01-01_Part_1_-_Subject_A` reads badly.

❓ `%20` (literal spaces in URLs) was considered as an option and should be dropped rather than offered: spaces break bare-URL autolinking in markdown and chat clients, and are ugly when copied.

### 4.5 Chapter numbering ✅

The **displayed** number is the ordinal position after sorting, not the prefix. `01, 02, 02b, 03` gives Chapters 1, 2, 3, 4. Prefixes never appear in rendered output.

Numbering runs **continuously across parts** by default: Part 2's first chapter is Chapter 4, not Chapter 1. The wrapper receives `index` precomputed (§8.2) so no wrapper implements this.

### 4.6 Prefix stripping ✅ / ❓

When `.title` is unset, the title is the filename with the prefix stripped. Pattern roughly `/^\d+[a-z]*(-\d+[a-z]*)*\s+/`.

❓ False positive: `1984 Orwell Review.md` strips to `Orwell Review`. `.title` overrides it, but the default is silently wrong. Options: accept and document, require a distinguishing separator, or warn when a stripped prefix is four or more digits.

In practice this is visible — a Dewey-ordered folder shows the odd file out in Obsidian's sidebar — so the low-cost answer is a warning.

---

## 5. The Build Passes

### 5.1 Two passes ✅

**Pass 1 — path index.** A directory scan building the name→paths maps (§6). No parsing, no fence extraction; just filenames and paths. Cheap.

**Pass 2 — post-order depth-first render.** Children render before their parent, so a folder wrapper receives fully processed children.

```
enter folder
	pass ancestor context down
	recurse into subfolders
	render each document
	collect TxEntry list
	render the folder wrapper
exit
```

Everything expensive happens once. Slugs are computable at any point, so links are rewritten during the render with no forward-reference problem.

### 5.2 Why the index is still needed ✅

A slug's *target* is deterministic, but an Obsidian wikilink does not give a path:

```
[[02 TxData]]           filename only — could be anywhere in the vault
[[TxData]]              prefix-stripped
[[Me/Stuff/House]]      a path
```

Resolving those requires knowing where files live. Hence the index — a scan, not a render pass.

### 5.3 What the walk must carry ✅

Post-order gives a node its descendants but never its siblings or ancestors. Both are needed:

- **Ancestor context** passes *down* on the way in — for breadcrumbs, and so each document knows its folder and position before it renders.
- **Child entries** collect *up* on the way out — for the wrapper.

### 5.4 Folder nesting ✅

A book with parts as subfolders means a folder whose children include other folders. `TxEntry` therefore needs a kind (`file` or `folder`), or `ITxFolder` needs a separate `folders` array. Post-order handles it naturally; only the type must express it.

---

## 6. Link Resolution

### 6.1 The maps ✅

Two maps, both `key → paths[]`:

| Map | Keyed by |
|---|---|
| documents | filename without extension |
| images | full filename with extension |

An array value for every entry, not a union of one-or-many: one shape, no narrowing, and `length > 1` is the duplicate check.

**Index each document under three keys:** its full filename (`02 TxData`), its prefix-stripped name (`TxData`), and its vault-relative path (`Me/Stuff/House`). Resolution tries path-match first, then name-match.

**Lowercase the key, keep the original in the value.** Obsidian resolves links case-insensitively; Windows and macOS filesystems mostly do; Linux does not. A vault authored on Windows would otherwise break on a Linux build server. Warn on case-only collisions.

### 6.2 Obsidian disambiguates itself ✅

Tested behaviour: when two notes share a name, Obsidian writes the full path with a display alias — `[[Me/Stuff/House|House]]` — and it **rewrites existing links** when a new collision appears. So an Obsidian-authored vault arrives already disambiguated, and duplicate detection is a sanity check rather than load-bearing.

### 6.3 Syntax to support ✅

| Form | Meaning |
|---|---|
| `[[Note]]` | link, slugified |
| `[[Note#Heading]]`, `[[#Heading]]` | link to an anchor |
| `[[Note\|Display Text]]` | link with alias |
| `[[image.png]]` | link to open the image |
| `![[image.png]]` | embed the image |
| `![[image.png\|300]]` | embed with `width="300"` |
| `![[Note]]` | embed a note's content |

Note the pipe is overloaded: alias for notes, width for images. That is Obsidian's convention and authors expect it.

`remark-obsidian-md` implements this shape — `root`, `urlPrefix`, pluggable `slugify`, and a supplied `contentMap` — and is worth copying as a design even if TxGen writes its own resolver. Writing our own keeps the map shared with route generation and avoids a thin dependency (one star, no releases at time of writing).

### 6.4 Pipeline order ✅

Wikilink resolution runs **before** Tx, so links are already `link` nodes when Tx's inline scanner walks them — and the scanner descends into link children, so a dot-tag inside link text still works.

❓ `==highlight==` and Tx's `.hl{}` are two syntaxes for one output. Not a conflict, but worth a deliberate decision.

### 6.5 Anchors and headings ❌

Documentation sites need heading anchors and a table of contents. Both come from the heading tree, which Tx does not currently annotate. Needed for `[[Note#Heading]]` to resolve at all.

---

## 7. Images and Assets

### 7.1 Mirror, don't serve the vault ✅

Images are fetched by the browser and must be under `public/`; markdown is not and must not. So the vault stays private and only images are copied:

```
content/docs/my-book/_images/photo.png
	→ public/docs/my-book/_images/photo.png
	→ referenced as /docs/my-book/_images/photo.png
```

**Mirror under the same prefix as the documents,** so an image sits beside the page that uses it. Putting the vault's own name in the URL exposes an internal name and makes the two trees diverge.

Flattening everything into one folder with hashed names was considered and rejected: it makes the mirror unsortable and unreadable, and the relative tree is what makes a stray file findable.

### 7.2 Reference-driven copy ✅

Collect every image reference during the render pass, then copy only what is referenced. That builds a complete list by the end of the build and avoids copying dead files.

**Slugify image filenames on copy** and record `original → slug` in the image map, so `![[My Photo (1).png]]` still resolves. Obsidian permits spaces, apostrophes and accents; `%20` and `%28` in URLs work but break in some tooling.

**Rewrite to absolute URLs.** `_images/x.png` resolves correctly from `/docs/book/page` but not from `/docs/book/page/` — a trailing slash makes it `…/page/_images/x.png` and a 404. Rewriting at build makes it independent of the host's trailing-slash setting.

❓ **Dynamic references are invisible.** A path built inside a `tx-d` fence (`"_images/" + .slug + ".png"`) will not be seen by the scanner. Mitigation: after the build, list `_images` files never referenced as a warning. Most will be genuinely unused; the occasional one is a missed dynamic reference.

### 7.3 Hashing and cleanup ✅

Hash each source image into the manifest so unchanged files are skipped on rebuild, and delete stale copies — otherwise `public/` accumulates images from renamed and deleted notes forever.

### 7.4 Optimisation ✅

Optimise at build — WebP/AVIF, resized variants — so each request is a fraction of the bytes. Avoid the Next.js `/_next/image` optimiser on a VPS: it is a server endpoint that can be hit with arbitrary parameters, where pre-optimised static files have no such surface.

---

## 8. Folder Wrappers

### 8.1 `_meta.md` ✅

A markdown file so Obsidian can edit it, containing a `tx-d` fence. It does for a folder what a note's metadata does for a note: it selects the folder's kind and sets the folder's own title, description, date and landing-page text. A book folder:

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

A `.txd` file would be invisible in Obsidian, which is the whole reason for the `.md` container.

**Notes declare intent; system files bind it to code.** `_meta.md` only selects an arm of the `TxFolders` union, by name. The TxGen global head, `TxFolder-Head.txd` (§8.2), binds each arm to a wrapper dot-tag through `.to.$$`, and `TxConfig.ts` maps that dot-tag to a React component. The vault stays portable between projects.

**A missing `_meta.md` means the default landing page.** `TxFolder-Head.txd` declares `tx-folder` with the default arm `TxDefaultFolder` and a default `.content` (§8.2); a folder without `_meta.md` keeps that default.

### 8.2 The folder union and the landing page ❌

**`TxFolder-Head.txd`** — the TxGen global head, merged first into every `_meta.md` module trait. The same example is TxData §11.5, where it illustrates the type-discriminated union:

```
^ITxFolder:                         // interface
	props in .FolderWrapperProps?   // set by the system (TxGen)
	title in .$$?                   // set by the user
	description in .$$?             // set by the user
	date in .Date?                  // set by the user
	content in .$$?                 // set by the user
	^to.$$                          // abstract: defined by every implementer (TxData §10.2)

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

**How the layers fit.**

1. The head defines the interface, the three arms, the union, and a default `tx-folder`.
2. A folder's `_meta.md` (§8.1) overrides `tx-folder` once (TxData §3.2): it selects an arm by name and fills the folder's metadata. Every arm has no required fields left, so selecting one constructs an instance. A folder without `_meta.md` keeps the default.
3. TxGen sets `.props` — the last, system-level layer. `props` is optional because the user never sets it.

`.to.$$` is set once, system-level, in the head. Per folder the user only selects the arm and sets metadata — a book, a blog, or a default landing page for a section of the tree grouped by category, subject or anything else. The three wrapper dot-tags — `.TxDefaultFolderWrapper`, `.TxBookWrapper`, `.TxBlogWrapper` — are TxComponents registered in `TxConfig.ts`, each with `.content` as its `contentProp`.

**These traits are consumed entirely inside Tx** — TxDoc, TxData and TxGen.

**The generated landing page.** For each folder route, TxGen generates a landing page whose whole source is:

```
%.tx-folder.to.$$
```

The `.to.$$` is written explicitly. A TxKeyRef in text renders `.to.$` implicitly (`The value is %.value`), and nothing could tell the compiler automatically that Tx-md is wanted instead (TxData §14.1). For a book folder the result is:

```
.TxBookWrapper: %props: %.tx-folder.props
	%.tx-folder.content
```

— a TxBlock that goes through the ordinary Tx-md pipeline and becomes an island like any other. Standing alone in its paragraph, the substitution is block-level Tx-md (§20 #32).

**No trait name crosses the boundary.** The arm was selected by name inside Tx, and it has already done its job: it chose which wrapper dot-tag `.to.$$` produces. The component receives only erased props and its content (TxData §12.1).

**What the system puts in `.props`:**

```
FolderWrapperProps:
	name in .$            // folder name, prefix stripped
	path in .$            // route
	title in .$$?         // copied by TxGen from tx-folder
	description in .$$?   // copied by TxGen from tx-folder
	date in .Date?        // copied by TxGen from tx-folder
	children in .TxEntry[]

TxEntry:
	filename in .$        // raw, with prefix
	order in .$           // the prefix, for sorting
	part in .N?
	index in .N           // ordinal after the canonical sort
	title in .$
	slug in .$
	date in .Date?
	tx-meta in .TxMeta?   // the child page's own metadata
```

`children` carries every child markdown file: its slug and its metadata. `order` and `index` are precomputed so no wrapper re-implements prefix parsing or natural sorting; `index` gives continuous chapter numbering. Each wrapper sorts as its kind requires — `TxBookWrapper` by Dewey prefix (`order`), `TxBlogWrapper` by `date` descending, the default wrapper however it chooses.

`.to.$$` passes only `props` and `content`, so TxGen copies the folder's own `title`, `description` and `date` from `tx-folder` into `FolderWrapperProps`. The wrapper sees the folder's metadata alongside its children's.

**A wrapper is an ordinary TxComponent receiving props.** `children` is just an array prop. Nothing new in the component model.

### 8.3 Ordering and the blog case ✅

A blog wrapper sorts by `date`, which means `.date` must be set or the entry is skipped with a warning. A book wrapper sorts by `order` and requires a Dewey prefix, likewise warning on a file without one.

### 8.4 Reentrancy ✅

`content` is `.$$`, so it goes through the Tx-md pipeline, which resolves against `TxConfig`. A folder wrapper is therefore an **island born from metadata** rather than from a `.md` file — the one place a component originates outside a document.

Two consequences: `_meta.md`'s own images still need collecting, and an island declared there attaches to the folder's index route rather than to any document.

✅ A `.$$` value may contain a TxComponent. The folder model depends on it: each arm's `.to.$$` is a TxBlock naming a wrapper TxComponent (§8.2).

### 8.5 Book structure ❓

"Reads chapter by chapter" has two readings that differ a lot:

- **Shell** — the book page is a cover, table of contents and next/previous navigation; each chapter is its own route with its own islands.
- **Single page** — all chapters concatenated into one route, pulling in every chapter's rendered output and every island.

The first is far simpler and matches "each chapter has its own slug." Needs confirming before the wrapper is written. Either way, deep links work: each chapter keeps its own route, and a wrapper can also show a chapter in place from URL parameters on its landing page (§4.3).

### 8.6 Inheritance ❓

Does a `_meta.md` in `book/` apply to `book/part-2/`? Per-folder with no inheritance is what every other static generator does and is easier to reason about.

---

## 9. Document Metadata

### 9.1 TxData, not YAML ✅

Frontmatter is replaced by a `tx-d` fence, because TxData is typed and YAML is not. A global `.txd` head defines the shape; each document sets it in any fence:

```
TxMeta:
	title in .$?
	desc in .$$?
	date in .Date?
	tags in .$[]?
	draft in .B: .false

#tx-meta in .TxMeta?
```

If `.title` is unset, the filename is used with the prefix stripped (§4.6).

Dates are ISO 8601 — `2026-09-25` — unambiguous, sorts as a string, and parses everywhere.

🔮 YAML frontmatter compatibility is a later version, for vaults that already use it.

### 9.2 What TxGen reads it for ✅

Titles, descriptions, dates for sorting, tags, and `draft` to exclude a page from the build. `draft` defaults to `.false` so a page publishes unless the author opts out.

---

## 10. Route Generation in a Host

### 10.1 Next.js ✅

One route file catches every path:

```
content/docs/book/chapter/page.md
app/docs/[...slug]/page.tsx
```

```tsx
export async function generateStaticParams() {
	// glob the vault, return [{ slug: ["book", "chapter", "01-page"] }, …]
}

export default async function Page({ params }) {
	const md = await fs.readFile(pathFor(params.slug), "utf8");
	const tree = await parseTxMarkdown(md);
	return <TxDoc tree={tree} />;
}
```

With `output: "export"` in `next.config.js`, `next build` walks every param and writes real HTML to `out/`. No server. `trailingSlash` decides `page.html` versus `page/index.html`; either works, and §7.2's absolute image URLs make the choice irrelevant to images.

**Folders generate routes too**, so `generateStaticParams` emits entries for folders as well as files. A second code path, straightforward but easy to forget.

### 10.2 Astro ✅

```
src/pages/docs/[...slug].astro
```

`getStaticPaths()` enumerates; Astro is SSG by default. Astro also exposes its markdown pipeline directly, so the Tx plugins slot in against plain `.md` files with no MDX anywhere:

```js
markdown: {
	remarkPlugins: [remarkTransmission],
	rehypePlugins: [rehypeTransmission],
}
```

### 10.3 The host is a thin shell ✅

Once components are pre-built ES modules (§11), the host does two small jobs: run the pipeline and write HTML. Everything island-related is Tx's, identical across hosts.

Which means the host need not be a framework at all. A Node script that globs the tree, calls `parseTxMarkdown`, and writes `.html` files is a complete generator. Next.js is then a convenience — navigation, search, theming — not a dependency.

---

## 11. The Island Build

### 11.1 Compile components to ES modules ❌

```bash
esbuild src/Counter.tsx --bundle --format=esm \
	--external:react --external:react-dom/client \
	--metafile --outfile=_tx/counter.js
```

`--external:react` is non-negotiable: two React instances in one page means broken hooks.

npm dependencies are **inlined** by `--bundle`, so a component importing a UI library needs no CDN. What dependencies determine is *where* the build can run — a machine with `node_modules` — not whether the result is portable. Once built, the module is self-contained.

`tsconfig` `paths` aliases resolve, either read from the file or passed as `--alias:@=./`.

### 11.2 Manifest ❌

Stable filename, hash as a field:

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

**The hash is a field, not part of the filename.** That is what lets a user hand-place `_tx/counter.js` without computing anything. Cache-busting still works: the site build emits `/_tx/counter.js?v=a3f9c1`.

**`inputs` comes from esbuild's `metafile`**, which reports every file that went into a bundle transitively. Checking only the entry file's mtime would ship a stale component when an imported hook changes.

### 11.3 Resolution order ❌

| Order | Case |
|---|---|
| 1 | manifest entry, module present → **managed** (built from source, staleness tracked) |
| 2 | no entry, but `_tx/<name>.js` exists → **unmanaged** (user-placed, never rebuilt or deleted) |
| 3 | neither → visible notice naming the tag |

Never throw, never render blank.

### 11.4 Import map and CSS ❌

```html
<script type="importmap">
{"imports":{"react":"/_tx/react.js","react-dom/client":"/_tx/react.js"}}</script>
```

`_tx/react.js` is built once from a two-line entry re-exporting React and `react-dom/client`. Every island resolves against it, so React downloads once per site no matter how many islands a page has.

**CSS is a separate artifact.** esbuild emits a component's stylesheet beside its module; the manifest records `styles` and the page links it once. Easy to forget, and the symptom is an island that works perfectly and looks wrong.

### 11.5 Client runtime ❌

```js
const els = document.querySelectorAll("[data-tx-component]");
// schedule by data-tx-hydrate: load | idle | visible | none
const mod = await import(el.dataset.txModule);
mountIsland(el, mod[el.dataset.txExport], props, mode);
```

```ts
mode === "hydrate"
	? hydrateRoot(el, createElement(Component, props))
	: createRoot(el).render(createElement(Component, props));
```

Because the import is dynamic and inside the runtime, **a page fetches modules only for islands it contains**. Tree-shaking achieved structurally rather than by a bundler pass; a prose-only page fetches nothing, not even React.

`idle` uses `requestIdleCallback`, `visible` uses `IntersectionObserver`, `none` never mounts.

### 11.6 Props ❌

Serialized into a JSON script block adjacent to the placeholder, not into an attribute — LaTeX and similar payloads are full of backslashes, quotes and angle brackets, and attribute-escaping those is bulky and bug-prone. A script block needs only `<` → `\u003c`.

TxKeyRefs resolve at build, so the browser receives plain data and **no TxData machinery ships to the client**.

❓ Two islands on one page drawing from the same `tx-d` data serialize it twice. A page-level JSON block referenced by key would deduplicate. Not worth building until a page has that shape.

### 11.7 Error boundaries ❌

Each island wraps in an error boundary. Without one, a single thrown component takes the whole page render with it — and in Obsidian, the whole note pane.

---

## 12. Component Distribution

### 12.1 A component repo ❌

```
Counter/
	src/Counter.tsx
	dist/counter.js
	tx-component.json
```

```json
{
	"name": "counter",
	"export": "default",
	"module": "dist/counter.js",
	"inputs": { "src/Counter.tsx": "sha256:9f2a…" },
	"external": ["react", "react-dom/client"],
	"styles": "dist/counter.css",
	"txVersion": "0.1"
}
```

Shipping the input hashes alongside the built module is what lets a consumer **verify without compiling**: hash the source, compare. A mismatch means the author edited and forgot to rebuild.

Source is also readable. A TxComponent is one small file — unlike an npm package with 400 transitive dependencies, it can actually be inspected in two minutes. That is the strongest argument for the ship-source model.

### 12.2 The user clones; the plugin never fetches ✅

Obsidian's developer policies prohibit obfuscated code, client-side telemetry, and self-updating code, and submissions are checked automatically. Executing code the **user** placed in their vault is established practice — Dataview's JS blocks, Templater's user scripts. A plugin that *downloads and runs* code from a URL is not, and would be flagged.

So distribution is: the user clones or downloads a component repo into their vault, and TxGen (or the plugin) builds only what is already there.

### 12.3 Externals ✅

Three tiers:

| Tier | Treatment |
|---|---|
| React | **always external** — one instance per page |
| large shared libraries | optionally external, added to the import map — otherwise five components ship five copies, each with its own context |
| everything else | bundled |

`external` belongs in the component's own `tx-component.json`, since the author knows what their module expects. The build checks the import map can satisfy it — a build-time error beats a blank island.

### 12.4 Providers ✅

Each island is its own React root, so context does not cross between them. The runtime wraps at mount:

```ts
providers.reduceRight((child, P) => createElement(P, null, child),
                      createElement(Component, props))
```

Better still, **hoist theme variables to `:root`**. Most of what a theme provider does is emit CSS custom properties; injected once globally, every island reads them through the cascade regardless of tree. Context is then needed only for genuinely behavioural things.

Providers holding shared state (a query client, a store) take their instance from the runtime rather than constructing per island.

---

## 13. Security 🔮

**Deferred to a future public version.** For now the only TxComponents linked are the author's own, and the author is responsible for them. Security must be revisited before Tx is released for others' components; this section is kept for that time.

### 13.1 The browser side is fine ✅

An island has exactly the powers any web page has: no filesystem, no Node, no server. A static site has no server process at all. There is no route from a hydrated component to the host machine.

### 13.2 Build time is the exposure ✅

`renderToString` runs on **your** machine, in Node, with your permissions. A component from a public repo executes there. That reverses the usual intuition: the visitor is fairly safe and the author is exposed — the same shape as an npm install script.

Mitigation: run build-time renders in the same Worker sandbox TxData uses for `>>` bodies.

### 13.3 CSP, not CORS ✅

CORS governs *reading responses*; it does not stop a request leaving. All three of these exfiltrate regardless:

```js
fetch(url, {mode: "no-cors"});
new Image().src = url;
navigator.sendBeacon(url, data);
```

CSP does stop them, and TxGen emits it:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; connect-src 'none'; img-src 'self' data:; frame-src 'none'">
```

`connect-src 'none'` kills fetch, XHR, WebSocket and `sendBeacon`; `img-src 'self' data:` closes the pixel channel.

Two practicalities: inline scripts need a nonce under a strict policy, so the build emits one for the runtime; and the policy must be **configurable and per-route**, since a legitimate component might want one endpoint and a dashboard elsewhere in the app needs its own.

---

## 14. Incremental Builds

### 14.1 What is hashed ❌

| Artifact | Invalidated by |
|---|---|
| a component module | any file in its `inputs` |
| an image copy | the source image's hash |
| a page | its `.md` source, its folder's `_meta.md`, the global `.txd` and any TxComponent props-trait `.txd`, `TxConfig.ts` |

The last row is the awkward one: a change to the global head or to `TxConfig.ts` invalidates every page. Correct, and worth stating so a full rebuild is not mistaken for a bug.

### 14.2 Cleanup ❌

Stale outputs must be deleted, not merely skipped — image copies from renamed notes, HTML from deleted pages, superseded module files. Otherwise the output directory only grows.

### 14.3 `tx watch` ❌

Rebuild on change. On a vault under `\\wsl.localhost\`, file watching over the network share is unreliable; running inside WSL (VSCode's WSL extension, or a shell in the distro) uses native inotify and works properly.

---

## 15. The CLI

```
tx check <glob>          parse + typecheck, print diagnostics, exit 1 on error
tx data <file> --out json   compile tx-d fences / .txd to JSON or an ES module
tx build <glob>          full pipeline: docs → HTML, components → ES modules, images → mirror
tx watch <glob>          rebuild on change
```

**The compiler is a library; the CLI is a thin wrapper.** The VSCode extension, the Obsidian plugin and the host's build all need the same entry points, and the CLI must not own them.

`tx data` earns its keep beyond Tx: a `.txd` file becomes a typed, human-editable data format anything can consume.

---

## 16. Other Consumers

### 16.1 The VS Code extension — first ✅

The editor target is a VS Code extension giving colouring, autocomplete, and hover information over fields and trait types, for Tx-md text, `tx-d` fences and `.txd` files. These are first-class, not deferred. The design is TxData §20; the TxDoc contribution is TxDoc §16.5.

The working arrangement for now: author notes in Obsidian; edit `tx-d` fences in VS Code with the Tx extension; view the result by building the site or running it in dev.

### 16.2 Obsidian plugin — future version 🔮

The least important piece of work; moved to a future version. Notes kept for then:

**Reading mode** uses `registerMarkdownPostProcessor`, which fires **per section** — one top-level block. Obsidian's own renderer runs first and does not know Tx, so the postprocessor recovers raw source via `ctx.getSectionInfo(el)` and re-runs it through the pipeline.

Obsidian renders sections lazily and *unrenders* them when scrolled far away, so islands mount and unmount as the user scrolls. Keep a `Map<HTMLElement, Root>` and `unmount()` on teardown; state resets on scroll-away.

**There is no build step in Obsidian**, so there is nothing to hydrate — `createRoot` creates the DOM directly. That is CSR, and it is simpler than the website path. It also means the plugin only needs the JS, never pre-rendered HTML.

**A settings tab** lists source folders and a component table (tag, source, status: up to date / stale / missing / unmanaged) with *Build stale* and *Rebuild all* buttons. Building runs async with a progress notice and never on note render — compiling on the display thread would freeze the UI on every note open. A *check on startup* toggle reports but does not build.

**Mobile has no compiler.** Obsidian mobile is a WebView: no Node, no `child_process`, no native binaries. But built modules are ordinary vault files, so they **sync** — compile once on desktop, and the phone imports what the desktop built. Only the build command is desktop-only; the table still renders with statuses and disabled buttons, which is a better experience than hiding the feature.

❓ `esbuild-wasm` for on-device building is ~10 MB and needs a vault-backed resolver; Sucrase (transform only, no bundling) is lighter but cannot resolve imports. Either would have to be **bundled into the plugin**, since downloading a compiler at runtime is itself remote code loading.

❓ True isolation in Obsidian needs a sandboxed iframe (`sandbox="allow-scripts"`, no `allow-same-origin`), because desktop Electron gives renderer code `window.require("fs")`. The costs are height negotiation and non-inherited CSS. Worth prototyping when the plugin phase arrives, not retrofitting.

**Obsidian Publish does not run plugins**, so the vault cannot itself be the website. TxGen output is the publishing story; the plugin is the authoring story.

---

## 17. Hosting

### 17.1 What the output needs ✅

A folder of static files and a server that serves them. No Node, no database.

### 17.2 Bandwidth ✅

On a VPS a flood of image requests saturates bandwidth or connections; the box gets slow, but there is no surprise bill. `limit_req` and `limit_conn` in nginx handle casual abuse. Hotlinking — someone embedding your images on their site — is the commoner nuisance and is one `Referer` rule.

**Cloudflare's free tier in front is the standard answer**: static files cache at the edge, so the origin serves each image once and a volumetric flood never reaches it. Nothing on a single VPS can absorb a distributed attack otherwise.

Combined with build-time image optimisation (§7.4), most of the exposure disappears.

---

## 18. Diagnostics

Inherited from TxDoc's pass-through rule and TxData's `{line, col, message}` contract. TxGen's own high-value messages:

| Condition | Message |
|---|---|
| duplicate slug | two files resolve to the same route, with both paths |
| ambiguous wikilink | `[[TxData]]` matches N files |
| case-only collision | two files differ only in case — will break on Linux |
| unresolved wikilink | no file matches |
| inconsistent prefix width | `100` will sort before `99` in this folder |
| file without a Dewey prefix in a Dewey folder | will sort oddly |
| blog entry without `.date` | skipped |
| unreferenced image | may be dead, or a dynamic reference the scanner missed |
| stale component | source changed since the module was built |
| missing component module | tag has no module and none was hand-placed |
| four-or-more-digit prefix stripped | possible false positive (`1984 …`) |

---

## 19. Implementation Plan

### 19.1 Order

1. **Tree walk and slug derivation.** Sorting, prefix parsing, slugification, duplicate detection. Pure functions, easily tested.
2. **The path index and wikilink rewriting.** Both maps, all three key forms, case handling.
3. **Route generation in Next.js.** `generateStaticParams`, the catch-all page, `output: "export"`.
4. **Image collection and mirroring.** Reference capture, slugify, copy, absolute rewrite, hash, cleanup.
5. **Document metadata.** `tx-meta` read from fences; titles, dates, `draft`.
6. **Folder walk with entries.** Post-order, ancestor context, `TxEntry` construction.
7. **Folder wrappers.** `_meta.md`, `ITxFolder`, one wrapper component end to end.
8. **The island build.** Manifest → esbuild → import map → client runtime, React only.
9. **Error boundaries.** (CSP emission is deferred with security, §13.)
10. **Incremental rebuild and cleanup.**
11. **`tx build` and `tx watch`.**
12. Astro host. (The Obsidian plugin is a future version.)

### 19.2 Minimum viable site

Steps 1–5. That produces a browsable, correctly linked static site with images — no folder wrappers, no islands. Worth reaching early, because it makes everything after it testable against something real.

Steps 6–8 add books, blogs and interactivity.

---

## 20. Open Items Register

Numbered independently of the TxDoc (§18) and TxData (§22) registers.

Status legend: ✅ resolved · 🟡 partially resolved · 🟠 unresolved.

| # | Item | Resolution | Status |
|---|---|---|---|
| 1 | Slug collision when part numbers are omitted from filenames | `01-01 Subject A` and `02-01 Subject A` both strip to the same name if prefixes were dropped; detection required regardless | 🟠 |
| 2 | Is a part a URL segment? | `/my-book/part-1/subject-a` is self-documenting; `/my-book/01-01-subject-a` is shorter | 🟠 |
| 3 | Prefix stripping false positive (`1984 Orwell Review`) | accept and document, require a separator, or warn at 4+ digits; warning is the low-cost answer (§4.6) | 🟡 |
| 4 | Renumbering changes URLs | accepted consequence; Obsidian fixes internal links, external bookmarks break | ✅ |
| 5 | Trailing-slash setting | either works; absolute image URLs make it irrelevant to assets | ✅ |
| 6 | `_intro.md` versus `index.md` for folder content | `_meta.md`'s `.content` field | ✅ |
| 7 | Do folders generate routes? | yes — a second `generateStaticParams` code path | ✅ |
| 8 | Book wrapper: shell versus single concatenated page | shell is simpler and matches per-chapter slugs; either way a wrapper can show a chapter in place from URL parameters (§4.3); needs confirming | 🟡 |
| 9 | `_meta.md` inheritance into subfolders | per-folder with no inheritance is the norm; needs confirming | 🟡 |
| 10 | Dynamic image references invisible to the scanner | mitigated by an unreferenced-file warning | ✅ |
| 11 | Case-only filename collisions | warn; lowercase keys, original in value | ✅ |
| 12 | Heading anchors and table of contents | ❌ not built, not yet designed — needed for `[[Note#Heading]]` | 🟠 |
| 13 | `==highlight==` versus `.hl{}` — two syntaxes, one output | decide deliberately | 🟠 |
| 14 | `%20` (spaces) in URLs as an option | dropped; hyphens only | ✅ |
| 15 | Shared-data deduplication across islands on one page | page-level JSON block by key | 🟠 |
| 16 | `.$$` values containing TxComponents | allowed — the folder model depends on it (§8.2) | ✅ |
| 17 | `_meta.md` islands attach to the folder route | stated; needs implementing | ✅ |
| 18 | YAML frontmatter compatibility | 🔮 | 🟠 |
| 19 | `esbuild-wasm` or Sucrase for on-device Obsidian builds | 🔮 with the Obsidian plugin — must be bundled, not fetched | 🟠 |
| 20 | Sandboxed iframe for Obsidian islands | 🔮 with the Obsidian plugin — the only arrangement where a stranger's component is safe | 🟠 |
| 21 | Build-time render inside the Worker sandbox | 🔮 deferred with security (#28) — same mechanism as TxData `>>` bodies | 🟠 |
| 22 | Per-route CSP configuration | 🔮 deferred with security (#28) — needs a config surface | 🟠 |
| 23 | Global `.txd` / `TxConfig.ts` change invalidates every page | correct; document so a full rebuild is not read as a bug | ✅ |
| 24 | Where TxGen settings live — `TxGen.ts` or a `TxGen.txd` | undecided | 🟠 |
| 25 | Vue / Svelte / Solid island adapters | 🔮 — React only for now | 🟠 |
| 26 | Search index generation | 🔮 — not yet considered | 🟠 |
| 27 | RSS / sitemap generation | 🔮 | 🟠 |
| 28 | TxComponent security (§13) | 🔮 deferred to a future public version; only the author's own components are linked for now | 🟠 |
| 29 | Editor target | VS Code extension with colouring, autocomplete and hover; Obsidian plugin a future version (§16) | ✅ |
| 30 | Folder without `_meta.md` | the head's default arm `TxDefaultFolder` — the default landing page (§8.1) | ✅ |
| 31 | Folder's own `title`, `description`, `date` reaching the wrapper | TxGen copies them into `FolderWrapperProps` (§8.2) | ✅ |
| 32 | Rendering a trait's `.to.$$` from text | explicit only: the landing page is `%.tx-folder.to.$$`; a bare TxKeyRef renders `.to.$` (TxData §14.1, §22 #53) | 🟡 |
| 33 | Deep links into a wrapper | landing-page URL plus URL parameters; parameter names are each wrapper's own (§4.3) | 🟡 |
| 34 | Folder kind → wrapper binding | `_meta.md` selects an arm by name; `TxFolder-Head.txd` binds the arm to a wrapper dot-tag via `.to.$$`; `TxConfig.ts` maps the dot-tag to the component (§8.1, §8.2) | ✅ |

---

## 21. Design Notes

1. **The prefix stays in the slug, and that is what makes one pass possible.** A slug computable from a path alone means links can be rewritten without resolving, rendering or even reading the target. Everything else in §5 follows.
2. **Dewey prefixes beat an index file** because the authoring act is a rename, which Obsidian already does well — and because the sidebar order then matches the published order with no second source of truth.
3. **The vault is not in `public/`.** Markdown is a build input; only images are web assets. Conflating them serves raw source at a public URL.
4. **Obsidian disambiguates its own links.** Tested: it writes full paths on collision and rewrites existing links when a new collision appears. So the resolver can be simpler than it first appears.
5. **Post-order gives children, never siblings.** Context must pass down on the way in, or breadcrumbs and next/previous links are impossible.
6. **Pre-built ES modules make the host framework a shell.** Next.js and Astro then run the pipeline and write files, and every island concern is Tx's — which is what collapsed three host-specific designs into one.
7. **The hash is a manifest field, not a filename.** That single choice is what allows a hand-placed module, which is what allows component distribution without a build.
8. **CORS is not a defence.** It governs reading responses, not sending requests. CSP is the tool, and it costs one emitted meta tag.
9. **Build time is the dangerous moment, not page view.** A third-party component executes on the author's machine with the author's permissions. The visitor is comparatively safe.
10. **Absolute image URLs.** Relative resolution silently depends on the host's trailing-slash setting; absolute does not.
11. **The compiler is a library.** Four consumers need the same entry points; the CLI is only one of them.
12. **A minimum viable site is five steps.** Reaching a browsable linked site before building wrappers or islands makes everything afterwards testable against something real.

---

## Appendix A — Output Layout

```
out/
	docs/
		index.html                        folder wrapper for /docs
		my-book/
			index.html                    folder wrapper (TxBook)
			01-01-subject-a.html
			01-01b-subject-b.html
			02-01-subject-d.html
			_images/
				diagram.png
	_tx/
		react.js                          shared, once per site
		counter.js
		counter.css
		desmos.js
		runtime.js
		manifest.json
```

## Appendix B — Config Reference ❓

TxGen needs a settings surface. Fields implied by this document:

| Field | Purpose |
|---|---|
| `vaultRoot` | path to the document tree |
| `urlPrefix` | prepended to every route (`/docs`) |
| `outDir`, `assetDir`, `moduleDir` | output locations |
| `slugify` | override the default slug function |
| `sortMode` | code-unit or natural |
| `imageFolder` | default `_images` |
| `csp` | policy string or per-route map |
| `componentSources` | folders scanned for `.tsx` |
| `draftsIncluded` | build `draft: .true` pages |

❓ Whether this is a `TxGen.ts` (project code, like `TxConfig.ts`) or a `TxGen.txd` (typed data, dogfooding TxData) is open. `TxConfig.ts` must be TypeScript because it holds component imports; TxGen settings hold none, so either works.

## Appendix C — Worked Example

**Source**

```
content/docs/
	_meta.md                              .tx-folder as .TxDefaultFolder
	my-book/
		_meta.md                          .tx-folder as .TxBookFolder
		01-01 Subject A.md
		01-01b Subject B.md
		02-01 Subject D.md
		_images/
			diagram.png
```

**`my-book/_meta.md`**

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

**`01-01 Subject A.md`**

````
See also [[01-01b Subject B]].

![[diagram.png]]

.counter

```tx-d
.tx-meta:
	.title: Subject A
	.date: 2026-09-25
```
````

**Result**

| Source | Route | Title | index |
|---|---|---|---|
| `my-book/_meta.md` | `/docs/my-book` | My Book | — |
| `01-01 Subject A.md` | `/docs/my-book/01-01-subject-a` | Subject A | 1 |
| `01-01b Subject B.md` | `/docs/my-book/01-01b-subject-b` | Subject B | 2 |
| `02-01 Subject D.md` | `/docs/my-book/02-01-subject-d` | Subject D | 3 |

`[[01-01b Subject B]]` → `/docs/my-book/01-01b-subject-b`.
`![[diagram.png]]` → `/docs/my-book/_images/diagram.png`.
`.counter` → a placeholder plus `<script type="module" src="/_tx/runtime.js">`, hydrated from `/_tx/counter.js`.

---

> **Fence convention.** CommonMark requires a closing fence at least as long as its opening fence, so a four-backtick fence may contain any three-backtick fence. Examples showing a `tx-d` block are therefore wrapped in four backticks. Content inside a fence is never indented for the fence's sake — it is preserved byte for byte, and the opening-fence stripping rule counts spaces only, so Tx's tabs always survive intact.
