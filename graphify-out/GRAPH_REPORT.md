# Graph Report - Aetherius  (2026-11-11)

## Corpus Check
- 136 files · ~70,685 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .example 2, .css 1)

## Summary
- 1013 nodes · 1574 edges · 73 communities (58 shown, 15 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `da85634c`
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
- web/package.json
- Welcome to Your Vault
- smoke.sh
- CLAUDE.md
- GEMINI.md
- pnpm Workspace Configuration (apps/*)
- Phase 1 Implementation Plan — Frontend / PWA Foundation
- Frontend & PWA Architecture
- ADR-006: Frontend PWA Design System and Architecture
- mockVaultService
- react
- compilerOptions
- dependencies
- devDependencies
- NotePreview.tsx
- vite.config.ts
- scripts
- Non-Negotiable Rules
- imports
- GitHubClient
- 2. Step-by-Step Execution Sequence
- Deployment Learnings & Workarounds
- ADR-007: Offline Storage, Mutation Queue, and Conflict Resolution
- P2 findings
- Markdown Intelligence & Knowledge Graph Architecture
- a11y
- ADR 010: Testing Strategy
- 1. 🚨 CRITICAL Security Vulnerabilities
- 2. Line-by-Line Frontend Review (`apps/web/src/`)
- 4. Frontend Code Quality & UX
- Work Streams (Parallel)
- ADR-009: Server-Side GitHub Token Storage
- Aetherius Audit Verification Report
- 🔴 CRITICAL: API Contract Violations
- Finding-by-Finding Verification
- test-migrations.sh
- 🟡 HIGH: Frontend Quality Issues
- 🟡 HIGH: Performance Issues
- 🟡 MEDIUM: Database & Infrastructure
- 🟢 LOW: Documentation & Configuration
- 🔴 CRITICAL: Data Loss & Crash Vectors
- Project Philosophy
- Documentation Rules
- UI and Implementation Rules
- AGENTS.md
- Final Authority
- vaultService
- WorkspaceView.tsx
- setupTests.ts
- 2026-11-11-repair-plan.md

## God Nodes (most connected - your core abstractions)
1. `vaultService` - 38 edges
2. `VaultFile` - 36 edges
3. `react` - 31 edges
4. `OfflineDatabase` - 29 edges
5. `@testing-library/react` - 22 edges
6. `GitHubClient` - 20 edges
7. `compilerOptions` - 19 edges
8. `WorkspaceView()` - 18 edges
9. `lucide-react` - 17 edges
10. `createHandler()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `5. API, cache and rendering` --references--> `vaultService`  [INFERRED]
  docs/architecture/frontend.md → apps/web/src/services/vault.ts
- `Decision` --references--> `NoteEditor()`  [INFERRED]
  docs/decisions/ADR-008-derived-markdown-intelligence-and-graph.md → apps/web/src/components/editor/NoteEditor.tsx
- `🟡 React Antipatterns` --references--> `NotePreview()`  [INFERRED]
  docs/audits/Aetherius-Audit-Report.md → apps/web/src/components/editor/NotePreview.tsx
- `🟡 React Antipatterns` --references--> `NoteToolbar()`  [INFERRED]
  docs/audits/Aetherius-Audit-Report.md → apps/web/src/components/editor/NoteToolbar.tsx
- `**Step 2 — Read-Through Caching & Offline Fallback**` --references--> `useVault()`  [INFERRED]
  ai/context/phase-4-sync-offline-plan.md → apps/web/src/hooks/useVault.ts

## Import Cycles
- None detected.

## Communities (73 total, 15 thin omitted)

### Community 0 - "Git-Backed Personal Vault API (OpenAPI 3.1.0)"
Cohesion: 0.12
Nodes (16): CI Pipeline (GitHub Actions), OpenAPI Validation Step (redocly lint), Bearer Auth Security Scheme (JWT), POST /v1/files — createFile, DELETE /v1/files/{path} — deleteFile, File Schema (path, type, name, content, sha, size, lastModified), GET /v1/files/{path} — getFile, GET /v1/sync/status — getSyncStatus (+8 more)

### Community 1 - "GitHub Architecture"
Cohesion: 0.18
Nodes (10): API Access, Existing vaults, branches, and moves, File Operations, Git History, GitHub Actions, GitHub Architecture, Purpose, Repository Ownership (+2 more)

### Community 2 - "package.json"
Cohesion: 0.05
Nodes (35): author, description, devDependencies, @biomejs/biome, fake-indexeddb, @playwright/test, supabase, vitest (+27 more)

### Community 3 - "Architecture Overview"
Cohesion: 0.07
Nodes (24): API Boundary, Architectural Principles, Architecture Overview, Backend, Clients, Derived Markdown Intelligence & Knowledge Graph, Development Architecture, GitHub (+16 more)

### Community 4 - "Security Architecture"
Cohesion: 0.13
Nodes (14): API Security, Authentication, Authorization, CI Security, Client Security, GitHub Security, Logging, Provider-token boundary (+6 more)

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
Cohesion: 0.11
Nodes (18): ADR Rules, AI Context, AI Development Workflow, API Rules, Architecture Documentation, CI Requirements, Core Architecture, Database Rules (+10 more)

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

### Community 19 - "web/package.json"
Cohesion: 0.10
Nodes (20): vitest, name, packageManager, private, type, version, autoprefixer, clsx (+12 more)

### Community 27 - "Phase 1 Implementation Plan — Frontend / PWA Foundation"
Cohesion: 0.13
Nodes (14): 1. Overview & Objectives, 2.1 Color Palette & Tokens, 2.2 Tactile Mechanical Physics & Shadows, 2.3 Typography Hierarchy, 2. Design System: "Warm Cream & Acid Neo-Memphis", 3.1 Key Views & Routes, 3.2 Responsive Adaptations & Platform UX, 3. Application Layout & Views (+6 more)

### Community 28 - "Frontend & PWA Architecture"
Cohesion: 0.15
Nodes (12): 1. Technical Stack, 2. Design System: "Warm Cream & Acid Neo-Memphis", 3.1 Desktop UX & Power-User Features, 3.2 Mobile PWA UX & Touch Specifics, 3. Application Shell & Layout, 4. Navigation and current workflows, 5. API, cache and rendering, 6. UX & Implementation Rules (+4 more)

### Community 29 - "ADR-006: Frontend PWA Design System and Architecture"
Cohesion: 0.25
Nodes (7): ADR-006: Frontend PWA Design System and Architecture, Consequences, Context, Decision, Negative, Positive, Related Decisions

### Community 30 - "mockVaultService"
Cohesion: 0.14
Nodes (10): DEFAULT_FILES, DEFAULT_VAULT, generateSha(), mockVaultService, CreateFileRequest, FileListResponse, SearchResponse, SyncOperation (+2 more)

### Community 31 - "react"
Cohesion: 0.08
Nodes (28): App(), ErrorBoundary, AuthContext, AuthContextType, AuthProvider(), mocks, Probe(), session (+20 more)

### Community 32 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleResolution (+12 more)

### Community 33 - "dependencies"
Cohesion: 0.25
Nodes (8): dependencies, clsx, lucide-react, markdown-it, react, react-dom, @supabase/supabase-js, tailwind-merge

### Community 34 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, autoprefixer, jsdom, postcss, tailwindcss, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event (+10 more)

### Community 35 - "NotePreview.tsx"
Cohesion: 0.06
Nodes (43): Badge(), BadgeProps, BacklinksPanel(), BacklinksPanelProps, FrontmatterCard(), FrontmatterCardProps, isExternal(), md (+35 more)

### Community 39 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, preview, test, test:coverage, typecheck

### Community 40 - "Non-Negotiable Rules"
Cohesion: 0.18
Nodes (11): 10. Keep the MVP Simple, 1. GitHub Is the Source of Truth, 2. Markdown Is the Canonical Note Format, 3. Supabase Is Not Canonical Note Storage, 4. Clients Must Not Perform Privileged GitHub Operations, 5. PWA and Swift Must Use the Same API, 6. OpenAPI Must Stay in Sync, 7. Database Changes Require Migrations (+3 more)

### Community 41 - "imports"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 42 - "GitHubClient"
Cohesion: 0.07
Nodes (34): 3. Line-by-Line Backend Review (`supabase/functions/api-v1/index.ts`), 🟡 Abysmal API Design, 🔴 Critical Security Vulnerability: SSRF & Path Injection, 🔴 OOM (Out of Memory) Crash Vector, Stream 3: Data Integrity Fixes, 1. GitHub Token Exposure — Rule #4 Violation, 2. SSRF / Path Injection, 3. XSS in Markdown Preview (+26 more)

### Community 43 - "2. Step-by-Step Execution Sequence"
Cohesion: 0.17
Nodes (11): 1. Overview & Objectives, 2. Step-by-Step Execution Sequence, 3. Adherence to Rules & Constraints, 4. Definition of Done, 5. Status, Phase 3 Implementation Plan — GitHub Vault, **Step 1 — GitHub Integration & Auth Flow**, **Step 2 — Vault Initialization (`POST /v1/vault`)** (+3 more)

### Community 44 - "Deployment Learnings & Workarounds"
Cohesion: 0.25
Nodes (7): 1. Supabase CLI Edge Function Bundling, 2. Vercel `ERR_INVALID_THIS` (pnpm + Node 20/22 mismatch), 3. GitHub Actions `pnpm/action-setup` Conflict, 4. Vite Environment Variables, 5. Vercel Monorepo `package-lock.json` Pitfall, 6. Supabase OAuth Redirect to Localhost, Deployment Learnings & Workarounds

### Community 46 - "ADR-007: Offline Storage, Mutation Queue, and Conflict Resolution"
Cohesion: 0.25
Nodes (7): ADR-007: Offline Storage, Mutation Queue, and Conflict Resolution, Consequences, Context, Decision, Negative, Positive, Related Decisions

### Community 47 - "P2 findings"
Cohesion: 0.05
Nodes (41): 1. Overview & Objectives, 2. Architecture & Data Flow, 3. Step-by-Step Execution Sequence, 4. Definition of Done, Phase 4 Implementation Plan — Offline Cache & Synchronization Engine, **Step 1 — IndexedDB Storage Layer**, **Step 2 — Read-Through Caching & Offline Fallback**, **Step 3 — Offline Mutation Queue & Background Sync** (+33 more)

### Community 50 - "Markdown Intelligence & Knowledge Graph Architecture"
Cohesion: 0.40
Nodes (4): Knowledge Graph Visualization, Markdown Intelligence & Knowledge Graph Architecture, Pipeline, Principles

### Community 51 - "a11y"
Cohesion: 0.06
Nodes (31): noAutofocus, noInteractiveElementToNoninteractiveRole, noLabelWithoutControl, noNoninteractiveElementToInteractiveRole, noStaticElementInteractions, noSvgWithoutTitle, useButtonType, useFocusableInteractive (+23 more)

### Community 52 - "ADR 010: Testing Strategy"
Cohesion: 0.20
Nodes (9): ADR 010: Testing Strategy, Backend (Supabase Edge Functions), Consequences, Context, Coverage Targets, Decision, Frontend (React & Services), Notes (+1 more)

### Community 53 - "1. 🚨 CRITICAL Security Vulnerabilities"
Cohesion: 0.12
Nodes (16): 1. 🚨 CRITICAL Security Vulnerabilities, 2. 🚨 CRITICAL Data Loss & Crash Vectors, 3. ⚠️ UX, Logic, and Performance Flaws, 4. 🛠 Tooling & Database Deficiencies, Aetherius Project Audit Report (Final Exhaustive Pass), App-Breaking Unicode/Emoji Crashes, Broken Offline Full-Text Search, Edge Function OOM (Out of Memory) Crash (+8 more)

### Community 54 - "2. Line-by-Line Frontend Review (`apps/web/src/`)"
Cohesion: 0.15
Nodes (12): 1. Tooling, Dependencies, & Static Analysis Audit, 2. Line-by-Line Frontend Review (`apps/web/src/`), 4. Database Schema Audit (`20260820082558_init_vaults.sql`), Aetherius Project Audit Report (Pass 2 - Exhaustive Deep Dive), 🔴 Critical Encoding Crash (`vault.ts`), 🔴 Data Integrity Flaws, ⚠️ Dependency & Workspace Configuration, 🔴 `GraphCanvas.tsx` Memory/Performance Leaks (+4 more)

### Community 55 - "4. Frontend Code Quality & UX"
Cohesion: 0.12
Nodes (15): 1. Architectural & Compliance Violations (AGENTS.md), 2. API Contract Drift (OpenAPI vs. Edge Functions), 3. Backend Security & Performance, 4. Frontend Code Quality & UX, 🟡 Accessibility (a11y) Nightmares, Aetherius Project Audit Report, 🔴 Critical Rule Violations, 🟡 Database Design Flaws (+7 more)

### Community 56 - "Work Streams (Parallel)"
Cohesion: 0.17
Nodes (11): Agreed Decisions, Audit Fix Implementation Plan, Execution Order, New ADR Required, Stream 1: Security — Server-Side Token Architecture, Stream 2: API Contract Alignment, Stream 4: Frontend Performance & Quality, Stream 5: Database Hardening (+3 more)

### Community 57 - "ADR-009: Server-Side GitHub Token Storage"
Cohesion: 0.18
Nodes (10): 2026-11-11 implementation clarification, ADR-009: Server-Side GitHub Token Storage, Consequences, Context, Decision, Negative, Neutral, Positive (+2 more)

### Community 58 - "Aetherius Audit Verification Report"
Cohesion: 0.22
Nodes (8): Aetherius Audit Verification Report, Executive Summary, P0 — Fix Immediately (Security & Data Loss), P1 — Fix Soon (API Contract & Performance), P2 — Fix Before Launch (Quality & UX), P3 — Fix Eventually (Polish), Recommended Fix Priority, Summary by Severity

### Community 59 - "🔴 CRITICAL: API Contract Violations"
Cohesion: 0.25
Nodes (8): 10. Error Schema Mismatch, 11. GET /v1/files Path Parameter Handling, 12. GET /v1/files/{path} Returns Wrong Schema, 13. PUT /v1/files/{path} Field Name Mismatch, 14. DELETE /v1/files/{path} Undocumented Query Param, 15. No Input Validation on POST /v1/vault, 16. Dangling Repositories on Failure, 🔴 CRITICAL: API Contract Violations

### Community 60 - "Finding-by-Finding Verification"
Cohesion: 0.25
Nodes (8): 26. No Focus Trapping in Modal, 27. Inaccessible Custom Inputs, 28. Global keydown Event Clashes, 29. TypeScript `any` Abuse, 30. Zero React Test Coverage, Finding-by-Finding Verification, 🟡 MEDIUM: Accessibility, 🟡 MEDIUM: Code Quality & Tooling

### Community 62 - "🟡 HIGH: Frontend Quality Issues"
Cohesion: 0.33
Nodes (6): 21. SearchModal.tsx Race Conditions, 22. WorkspaceView.tsx useMemo / Re-render Issues, 23. Offline Search Broken, 24. Hardcoded Autocomplete Position, 25. Header Rendering Bug in NotePreview, 🟡 HIGH: Frontend Quality Issues

### Community 63 - "🟡 HIGH: Performance Issues"
Cohesion: 0.40
Nodes (5): 17. GraphCanvas.tsx O(N²) Physics + Memory Leak, 18. graphIndexer.ts Synchronous Nested Loop, 19. Search API Rate Limiting, 20. Search Fallback Fetches Entire Tree, 🟡 HIGH: Performance Issues

### Community 64 - "🟡 MEDIUM: Database & Infrastructure"
Cohesion: 0.40
Nodes (5): 31. Missing CHECK Constraints, 32. RLS Policy Weaknesses, 33. CI Only Validates OpenAPI, 34. No Linter Configured, 🟡 MEDIUM: Database & Infrastructure

### Community 65 - "🟢 LOW: Documentation & Configuration"
Cohesion: 0.40
Nodes (5): 35. PNPM Version Mismatch, 36. Documentation Drift, 37. TypeScript skipLibCheck, 38. Rule #10 Violation (Premature Features), 🟢 LOW: Documentation & Configuration

### Community 66 - "🔴 CRITICAL: Data Loss & Crash Vectors"
Cohesion: 0.40
Nodes (5): 6. Data Loss on File Switch, 7. Unicode/Emoji Crash (btoa/atob), 8. Edge Function OOM on Large Vaults, 9. Unhandled Promise / Infinite Loading, 🔴 CRITICAL: Data Loss & Crash Vectors

### Community 67 - "Project Philosophy"
Cohesion: 0.20
Nodes (10): AI-assisted development, AI is not the authority, API-first, Automated enforcement, Documented architecture, Open formats, Project Philosophy, Start simple (+2 more)

### Community 68 - "Documentation Rules"
Cohesion: 0.50
Nodes (3): ADRs, docs/, Documentation Rules

### Community 69 - "UI and Implementation Rules"
Cohesion: 0.50
Nodes (4): 1. No Silent Failures on Missing State, 2. No Silent Auto-Generation, 3. React Rules of Hooks and Early Returns, UI and Implementation Rules

### Community 74 - "vaultService"
Cohesion: 0.10
Nodes (9): OfflineDatabase, OfflineMutation, networkError(), pathUrl(), textFile(), VaultApiError, vaultService, Vault (+1 more)

### Community 76 - "WorkspaceView.tsx"
Cohesion: 0.05
Nodes (55): Button(), ButtonProps, Input(), InputProps, Modal(), ModalProps, NoteEditor(), NoteEditorProps (+47 more)

## Knowledge Gaps
- **536 isolated node(s):** `name`, `private`, `version`, `type`, `packageManager` (+531 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 603 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fake-indexeddb` connect `react` to `package.json`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `vaultService` (e.g. with `**Step 2 — Read-Through Caching & Offline Fallback**` and `**Step 3 — Offline Mutation Queue & Background Sync**`) actually correct?**
  _`vaultService` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _536 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Git-Backed Personal Vault API (OpenAPI 3.1.0)` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `package.json` to `GitHubClient`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Should `Architecture Overview` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._