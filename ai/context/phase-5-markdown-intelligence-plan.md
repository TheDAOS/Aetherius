# Phase 5 Implementation Plan — Markdown Intelligence & Interactive Knowledge Graph

## 1. Overview & Objectives

Phase 5 introduces intelligent note linking, bi-directional backlinks, YAML frontmatter inspection, tag indexing, and an interactive 2D Neo-Memphis force-directed knowledge graph to Aetherius.

Crucially, **all intelligence is derived state from standard Markdown files** (AGENTS.md Rule #1 & #3). The user's private GitHub repository remains the sole canonical source of truth with zero database lock-in.

## 2. Architecture & Data Flow

```text
  ┌────────────────────────────────────────────────────────┐
  │         User Vault Markdown Files (GitHub / Cache)     │
  └───────────────────────────┬────────────────────────────┘
                              │
  ┌───────────────────────────▼────────────────────────────┐
  │                 Markdown AST Parser                    │
  │     - YAML Frontmatter (tags, aliases, status)         │
  │     - [[Wiki-Links]] Extraction & Resolution           │
  │     - Inline #tag Detection                            │
  └───────────────────────────┬────────────────────────────┘
                              │
  ┌───────────────────────────▼────────────────────────────┐
  │                 Graph & Backlink Engine                │
  │     - Forward Links & Bi-directional Backlinks         │
  │     - Unlinked Mentions Scanner                        │
  │     - Tag Registry & Topology Matrix                   │
  └─────────────┬───────────────────────────┬──────────────┘
                │                           │
  ┌─────────────▼─────────────┐   ┌─────────▼──────────────┐
  │  Backlinks & Mentions UI  │   │ 2D Force-Directed Graph│
  │  - Context Snippets       │   │ - Interactive Canvas   │
  │  - 1-Click Link Insertion │   │ - Local & Global View  │
  └───────────────────────────┘   └────────────────────────┘
```

## 3. Step-by-Step Execution Sequence

### **Step 1 — Markdown AST & Frontmatter Parser**
- Implement `apps/web/src/services/intelligence/markdownParser.ts`:
  - YAML frontmatter parser and metadata extractor.
  - `[[wiki-links]]` tokenizer and path resolver.
  - Inline tag scanner.
  - Safe HTML rendering with relative image path resolution.

### **Step 2 — Graph & Backlink Indexing Engine**
- Implement `apps/web/src/services/intelligence/graphIndexer.ts`:
  - Builds graph nodes and edges from all cached vault notes.
  - Maps bi-directional backlinks and unlinked mentions.
  - Maintains tag indices.

### **Step 3 — Frontmatter Card & Backlinks UI**
- Build `FrontmatterCard.tsx` for metadata badges in the note preview.
- Build `BacklinksPanel.tsx` in `apps/web/src/components/editor/` showing linked references and unlinked mentions.

### **Step 4 — Interactive 2D Force-Directed Knowledge Graph**
- Build `GraphCanvas.tsx` with HTML5 Canvas physics simulation (Neo-Memphis visual styling).
- Build `GraphModal.tsx` and full-screen graph toggle (`Ctrl+G`).

### **Step 5 — Editor Autocomplete, Indentation & Conflict Diff Modal**
- Add `[[` wikilink autocomplete popup to `NoteEditor.tsx`.
- Support Tab / Shift+Tab indentation.
- Implement `ConflictModal.tsx` for 3-way conflict resolution.

### **Step 6 — Verification & Quality Checks**
- `tsc -b && vite build` passing with zero errors.
- Validate OpenAPI with `redocly lint openapi/openapi.yaml`.
- Update Graphify knowledge graph (`graphify update .`).

## 4. Definition of Done
Phase 5 is complete when a user can navigate between notes via `[[wiki-links]]`, inspect frontmatter metadata, explore bi-directional backlinks, visualize their entire knowledge vault as an interactive 2D graph, and resolve merge conflicts with a dedicated diff UI.
