# Graph Report - Aetherius  (2026-08-22)

## Corpus Check
- 88 files · ~34,147 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 627 nodes · 796 edges · 51 communities (44 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `02f369a8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Git-Backed Personal Vault API (OpenAPI 3.1.0)
- GitHub Architecture
- package.json
- Architecture Overview
- Security Architecture
- Supabase Architecture
- ADR-002: Supabase Responsibilities
- ADR-003: API Boundary
- ADR-004: Markdown Vault Format
- AGENTS.md
- ADR-005: PWA and Swift Share the Same API
- 2. Step-by-Step Execution Sequence
- ADR-001: GitHub Is the Source of Truth
- 3. Step-by-Step Execution Sequence
- Authentication Architecture
- Data Flow
- Project: {{name}}
- Personal Knowledge Vault
- Daily Note - {{date}}
- Git-Backed Personal Vault
- Welcome to Your Vault
- rules/graphify.md
- workflows/graphify.md
- CLAUDE.md
- GEMINI.md
- pnpm Workspace Configuration (apps/*)
- Phase 1 Implementation Plan — Frontend / PWA Foundation
- Frontend & PWA Architecture
- ADR-006: Frontend PWA Design System and Architecture
- types/vault.ts
- WorkspaceView.tsx
- compilerOptions
- web/package.json
- devDependencies
- graphIndexer.ts
- VaultFile
- imports
- GitHubClient
- 2. Step-by-Step Execution Sequence
- Deployment Learnings & Workarounds
- ADR-007: Offline Storage, Mutation Queue, and Conflict Resolution
- 3. Step-by-Step Execution Sequence
- ADR-008: Derived Markdown Intelligence, Wikilinks, and Knowledge Graph
- Offline Caching & Synchronization Architecture
- Markdown Intelligence & Knowledge Graph Architecture

## God Nodes (most connected - your core abstractions)
1. `VaultFile` - 25 edges
2. `VaultService` - 18 edges
3. `compilerOptions` - 18 edges
4. `MockVaultService` - 16 edges
5. `OfflineDatabase` - 15 edges
6. `Git-Backed Personal Vault API (OpenAPI 3.1.0)` - 14 edges
7. `SyncStatus` - 13 edges
8. `GitHubClient` - 13 edges
9. `Security Architecture` - 13 edges
10. `Architecture Overview` - 12 edges

## Surprising Connections (you probably didn't know these)
- `OpenAPI Validation Step (redocly lint)` --references--> `Git-Backed Personal Vault API (OpenAPI 3.1.0)`  [EXTRACTED]
  .github/workflows/ci.yml → openapi/openapi.yaml
- `BacklinksPanelProps` --references--> `BacklinkReference`  [EXTRACTED]
  apps/web/src/components/editor/BacklinksPanel.tsx → apps/web/src/services/intelligence/graphIndexer.ts
- `NotePreviewProps` --references--> `BacklinkReference`  [EXTRACTED]
  apps/web/src/components/editor/NotePreview.tsx → apps/web/src/services/intelligence/graphIndexer.ts
- `GraphCanvasProps` --references--> `VaultGraphIndex`  [EXTRACTED]
  apps/web/src/components/graph/GraphCanvas.tsx → apps/web/src/services/intelligence/graphIndexer.ts
- `GraphModalProps` --references--> `VaultGraphIndex`  [EXTRACTED]
  apps/web/src/components/graph/GraphModal.tsx → apps/web/src/services/intelligence/graphIndexer.ts

## Import Cycles
- None detected.

## Communities (51 total, 7 thin omitted)

### Community 0 - "Git-Backed Personal Vault API (OpenAPI 3.1.0)"
Cohesion: 0.12
Nodes (16): CI Pipeline (GitHub Actions), OpenAPI Validation Step (redocly lint), Bearer Auth Security Scheme (JWT), POST /v1/files — createFile, DELETE /v1/files/{path} — deleteFile, File Schema (path, type, name, content, sha, size, lastModified), GET /v1/files/{path} — getFile, GET /v1/sync/status — getSyncStatus (+8 more)

### Community 1 - "GitHub Architecture"
Cohesion: 0.20
Nodes (9): API Access, File Operations, Git History, GitHub Actions, GitHub Architecture, Purpose, Repository Ownership, Source of Truth (+1 more)

### Community 2 - "package.json"
Cohesion: 0.08
Nodes (24): fake-indexeddb, author, description, devDependencies, fake-indexeddb, supabase, vitest, devEngines (+16 more)

### Community 3 - "Architecture Overview"
Cohesion: 0.13
Nodes (14): API Boundary, Architectural Principles, Architecture Overview, Backend, Clients, Derived Markdown Intelligence & Knowledge Graph, Development Architecture, GitHub (+6 more)

### Community 4 - "Security Architecture"
Cohesion: 0.14
Nodes (13): API Security, Authentication, Authorization, CI Security, Client Security, GitHub Security, Logging, Purpose (+5 more)

### Community 5 - "Supabase Architecture"
Cohesion: 0.15
Nodes (12): API Layer, Application metadata, Canonical, Canonical vs Derived Data, Cost and Infrastructure, Database, Database Migrations, Derived data (+4 more)

### Community 6 - "ADR-002: Supabase Responsibilities"
Cohesion: 0.17
Nodes (11): ADR-002: Supabase Responsibilities, Alternatives Considered, Consequences, Constraints, Context, Decision, Negative, Positive (+3 more)

### Community 7 - "ADR-003: API Boundary"
Cohesion: 0.17
Nodes (11): ADR-003: API Boundary, Alternatives Considered, Consequences, Context, Decision, Direct PWA → GitHub API, Negative, Positive (+3 more)

### Community 8 - "ADR-004: Markdown Vault Format"
Cohesion: 0.17
Nodes (11): ADR-004: Markdown Vault Format, Alternatives Considered, Consequences, Constraints, Context, Decision, Negative, Positive (+3 more)

### Community 9 - "AGENTS.md"
Cohesion: 0.04
Nodes (44): 10. Keep the MVP Simple, 1. GitHub Is the Source of Truth, 2. Markdown Is the Canonical Note Format, 3. Supabase Is Not Canonical Note Storage, 4. Clients Must Not Perform Privileged GitHub Operations, 5. PWA and Swift Must Use the Same API, 6. OpenAPI Must Stay in Sync, 7. Database Changes Require Migrations (+36 more)

### Community 10 - "ADR-005: PWA and Swift Share the Same API"
Cohesion: 0.17
Nodes (11): ADR-005: PWA and Swift Share the Same API, Alternatives Considered, Consequences, Constraints, Context, Decision, Negative, Positive (+3 more)

### Community 11 - "2. Step-by-Step Execution Sequence"
Cohesion: 0.18
Nodes (10): 1. Overview & Objectives, 2. Step-by-Step Execution Sequence, 3. Adherence to Rules & Constraints, 4. Status, Phase 2 Implementation Plan — Supabase Backend, **Step 1 — Supabase Local Environment Setup**, **Step 2 — Database Schema & RLS (Migrations)**, **Step 3 — Authentication Integration** (+2 more)

### Community 12 - "ADR-001: GitHub Is the Source of Truth"
Cohesion: 0.18
Nodes (10): ADR-001: GitHub Is the Source of Truth, Alternatives Considered, Application-owned storage, Consequences, Context, Decision, Negative, Positive (+2 more)

### Community 13 - "3. Step-by-Step Execution Sequence"
Cohesion: 0.17
Nodes (11): 1. Overview & Objectives, 2. Architecture & Data Flow, 3. Step-by-Step Execution Sequence, 4. Definition of Done, Phase 5 Implementation Plan — Markdown Intelligence & Interactive Knowledge Graph, **Step 1 — Markdown AST & Frontmatter Parser**, **Step 2 — Graph & Backlink Indexing Engine**, **Step 3 — Frontmatter Card & Backlinks UI** (+3 more)

### Community 14 - "Authentication Architecture"
Cohesion: 0.22
Nodes (8): Authentication Architecture, Authentication Provider, Authorization, Client Authentication, Credential Rules, Future Native Client, GitHub Authorization, Purpose

### Community 15 - "Data Flow"
Cohesion: 0.22
Nodes (8): Data Flow, File Operations, Future Derived Data, Purpose, Read Flow, Search, Synchronization, Write Flow

### Community 16 - "Project: {{name}}"
Cohesion: 0.33
Nodes (5): Architecture & Design, Goals & Non-Goals, Next Steps, Overview, Project: {{name}}

### Community 17 - "Personal Knowledge Vault"
Cohesion: 0.40
Nodes (4): Note Format, Personal Knowledge Vault, Portability & Ownership, Structure

### Community 18 - "Daily Note - {{date}}"
Cohesion: 0.40
Nodes (4): Daily Note - {{date}}, Notes & Thoughts, Objectives, Tasks & Follow-ups

### Community 19 - "Git-Backed Personal Vault"
Cohesion: 0.40
Nodes (4): Aetherius, Architecture, Git-Backed Personal Vault, Project Status

### Community 27 - "Phase 1 Implementation Plan — Frontend / PWA Foundation"
Cohesion: 0.13
Nodes (14): 1. Overview & Objectives, 2.1 Color Palette & Tokens, 2.2 Tactile Mechanical Physics & Shadows, 2.3 Typography Hierarchy, 2. Design System: "Warm Cream & Acid Neo-Memphis", 3.1 Key Views & Routes, 3.2 Responsive Adaptations & Platform UX, 3. Application Layout & Views (+6 more)

### Community 28 - "Frontend & PWA Architecture"
Cohesion: 0.17
Nodes (11): 1. Technical Stack, 2. Design System: "Warm Cream & Acid Neo-Memphis", 3.1 Desktop UX & Power-User Features, 3.2 Mobile PWA UX & Touch Specifics, 3. Application Shell & Layout, 4. Routes & Navigation Structure, 5. Mock API & OpenAPI Conformance, Color Palette & Tokens (+3 more)

### Community 29 - "ADR-006: Frontend PWA Design System and Architecture"
Cohesion: 0.25
Nodes (7): ADR-006: Frontend PWA Design System and Architecture, Consequences, Context, Decision, Negative, Positive, Related Decisions

### Community 30 - "types/vault.ts"
Cohesion: 0.07
Nodes (30): Button(), ButtonProps, Input(), InputProps, Modal(), ModalProps, TopHeaderProps, GitStatusBadge() (+22 more)

### Community 31 - "WorkspaceView.tsx"
Cohesion: 0.12
Nodes (22): App(), NoteEditor(), NoteEditorProps, NoteToolbar(), NoteToolbarProps, ViewMode, GraphModal(), AppShell() (+14 more)

### Community 32 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleResolution (+15 more)

### Community 33 - "web/package.json"
Cohesion: 0.08
Nodes (23): dependencies, clsx, lucide-react, react, react-dom, @supabase/supabase-js, tailwind-merge, name (+15 more)

### Community 34 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, autoprefixer, postcss, tailwindcss, @types/node, @types/react, @types/react-dom, typescript (+13 more)

### Community 35 - "graphIndexer.ts"
Cohesion: 0.12
Nodes (24): Badge(), BadgeProps, BacklinksPanel(), BacklinksPanelProps, FrontmatterCard(), FrontmatterCardProps, NotePreview(), NotePreviewProps (+16 more)

### Community 40 - "VaultFile"
Cohesion: 0.09
Nodes (12): Sidebar(), SidebarProps, FileItem(), FileItemProps, FileTree(), FileTreeProps, TreeNode, OfflineDatabase (+4 more)

### Community 41 - "imports"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 43 - "2. Step-by-Step Execution Sequence"
Cohesion: 0.17
Nodes (11): 1. Overview & Objectives, 2. Step-by-Step Execution Sequence, 3. Adherence to Rules & Constraints, 4. Definition of Done, 5. Status, Phase 3 Implementation Plan — GitHub Vault, **Step 1 — GitHub Integration & Auth Flow**, **Step 2 — Vault Initialization (`POST /v1/vault`)** (+3 more)

### Community 44 - "Deployment Learnings & Workarounds"
Cohesion: 0.25
Nodes (7): 1. Supabase CLI Edge Function Bundling, 2. Vercel `ERR_INVALID_THIS` (pnpm + Node 20/22 mismatch), 3. GitHub Actions `pnpm/action-setup` Conflict, 4. Vite Environment Variables, 5. Vercel Monorepo `package-lock.json` Pitfall, 6. Supabase OAuth Redirect to Localhost, Deployment Learnings & Workarounds

### Community 46 - "ADR-007: Offline Storage, Mutation Queue, and Conflict Resolution"
Cohesion: 0.25
Nodes (7): ADR-007: Offline Storage, Mutation Queue, and Conflict Resolution, Consequences, Context, Decision, Negative, Positive, Related Decisions

### Community 47 - "3. Step-by-Step Execution Sequence"
Cohesion: 0.17
Nodes (11): 1. Overview & Objectives, 2. Architecture & Data Flow, 3. Step-by-Step Execution Sequence, 4. Definition of Done, Phase 4 Implementation Plan — Offline Cache & Synchronization Engine, **Step 1 — IndexedDB Storage Layer**, **Step 2 — Read-Through Caching & Offline Fallback**, **Step 3 — Offline Mutation Queue & Background Sync** (+3 more)

### Community 48 - "ADR-008: Derived Markdown Intelligence, Wikilinks, and Knowledge Graph"
Cohesion: 0.25
Nodes (7): ADR-008: Derived Markdown Intelligence, Wikilinks, and Knowledge Graph, Consequences, Context, Decision, Negative, Positive, Related Decisions

### Community 49 - "Offline Caching & Synchronization Architecture"
Cohesion: 0.33
Nodes (5): Conflict Resolution, Mutation Lifecycle, Offline Caching & Synchronization Architecture, Overview, Storage Layer (`offlineDb.ts`)

### Community 50 - "Markdown Intelligence & Knowledge Graph Architecture"
Cohesion: 0.40
Nodes (4): Knowledge Graph Visualization, Markdown Intelligence & Knowledge Graph Architecture, Pipeline, Principles

## Knowledge Gaps
- **334 isolated node(s):** `name`, `private`, `version`, `type`, `packageManager` (+329 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `VaultFile` connect `VaultFile` to `graphIndexer.ts`, `types/vault.ts`, `WorkspaceView.tsx`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `VaultService` connect `VaultFile` to `types/vault.ts`, `WorkspaceView.tsx`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _334 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Git-Backed Personal Vault API (OpenAPI 3.1.0)` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Architecture Overview` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `Security Architecture` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._