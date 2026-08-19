Git-Backed Personal Vault

1. Project Overview

We are building a Git-backed personal knowledge/vault application.

The application will provide a modern interface for creating, editing, organizing, searching, and eventually intelligently exploring Markdown notes.

The key architectural idea is:

The user’s private GitHub repository is the source of truth for their vault.

The application itself is an interface and API layer around the user’s repository. We do not want to make the application’s database the primary owner of the user’s notes.

The goal is to create something that works as a:

* Progressive Web App (PWA)
* Native iOS application using Swift/SwiftUI
* GitHub-backed Markdown vault
* Eventually an AI-assisted knowledge-management system

The project should remain free/zero-cost during development and initial use, relying on free tiers and open-source tooling wherever practical.

⸻

2. Core Concept

A user signs into the application with GitHub.

The application allows them to create a private repository from our vault template.

For example:

Our template repository
        │
        │ create from template
        ▼
User's private repository
        │
        ├── notes/
        ├── assets/
        ├── templates/
        └── .vault/

That repository becomes the user’s personal vault.

The user can then access the same vault through:

PWA
Swift iOS App
GitHub directly

The actual Markdown files remain ordinary files in the user’s repository.

The user therefore retains ownership and portability of their data.

⸻

3. Fundamental Architectural Principle

The most important project decision is:

GitHub is the source of truth.

Markdown files stored in the user’s private GitHub repository are canonical.

Supabase is NOT the primary storage system for notes.

The architecture is:

PWA
  │
  ▼
Supabase API / Edge Functions
  │
  ▼
GitHub API
  │
  ▼
User's Private GitHub Vault

The future Swift app uses exactly the same backend/API:

PWA ───────┐
           │
           ▼
       Supabase
           │
           ▼
        GitHub
           ▲
           │
Swift ─────┘

This keeps the clients independent from GitHub implementation details.

⸻

4. What the Application Does

The initial application should allow a user to:

1. Sign in with GitHub.
2. Create a private vault repository from our template.
3. Browse their vault.
4. Create Markdown notes.
5. Edit Markdown notes.
6. Delete notes.
7. Organize notes into directories.
8. Store assets/files.
9. Search notes.
10. Commit changes to their GitHub repository.
11. Access the same vault from different devices.

Later it should support:

* offline access
* offline editing
* synchronization
* conflict detection/resolution
* native iOS features
* advanced search
* backlinks
* knowledge graphs
* semantic search
* AI-powered vault queries
* automatic relationships between notes

These advanced features are deliberately NOT part of the first MVP.

⸻

5. User Data Model

The user’s vault should primarily contain normal files.

Example:

my-vault/
├── notes/
│   ├── programming/
│   │   ├── react.md
│   │   ├── swift.md
│   │   └── databases.md
│   │
│   ├── projects/
│   │   └── vault.md
│   │
│   └── miscellaneous/
│
├── assets/
│   └── images/
│
├── templates/
│
├── .vault/
│   └── config.json
│
└── README.md

Markdown is the canonical note format.

Notes may eventually use frontmatter:

---
title: Swift Concurrency
tags:
  - swift
  - concurrency
created: 2026-08-18
updated: 2026-08-18
---

The application should avoid creating a proprietary data format that traps the user inside the application.

⸻

6. Technology Stack

Frontend

Use:

* React
* TypeScript
* Vite
* React Router
* PWA support

The PWA is hosted on:

* Vercel

Vercel is preferred because it provides a convenient free deployment workflow and integrates well with GitHub.

⸻

Backend

Use:

* Supabase
* Supabase Auth
* Supabase Edge Functions
* Supabase Postgres

Supabase is responsible for:

Authentication

GitHub-based authentication.

Application metadata

For example:

vaults
------
id
user_id
github_owner
github_repo
branch
created_at

API

Supabase Edge Functions provide the backend API.

Important restriction

Supabase should NOT store the user’s Markdown notes as the canonical data.

⸻

7. GitHub

GitHub provides:

* private repositories
* Markdown storage
* Git history
* version history
* repository ownership
* file storage
* GitHub API
* GitHub Actions

The backend interacts with GitHub using the GitHub API.

The PWA and Swift app should NOT directly handle privileged GitHub credentials.

The flow should be:

Client
  ↓
Supabase Edge Function
  ↓
GitHub API
  ↓
User repository

No backend VPS is required.

No persistent server filesystem is required.

⸻

8. GitHub Vault Template

We will maintain a separate repository containing the default vault structure.

Example:

vault-template/
├── notes/
│   ├── programming/
│   ├── projects/
│   └── miscellaneous/
├── assets/
├── templates/
├── .vault/
└── README.md

When a new user creates a vault:

vault-template
       │
       ▼
User's private repository

The user’s repository then becomes independent.

⸻

9. API

The PWA and Swift app must communicate through a common API.

The API should be documented using:

openapi/openapi.yaml

The API will contain endpoints conceptually similar to:

GET    /v1/vault
GET    /v1/files
GET    /v1/files/:path
POST   /v1/files
PUT    /v1/files/:path
DELETE /v1/files/:path
GET    /v1/search?q=
POST   /v1/sync
GET    /v1/sync/status

The exact API will be designed before significant implementation begins.

The OpenAPI definition is the canonical API contract.

Any API change should update OpenAPI.

The PWA and future Swift app should be built against the same API contract.

⸻

10. Swift App

The native iOS application will be built later using:

* Swift
* SwiftUI
* SwiftData where appropriate
* native iOS APIs

It should use the same backend API as the PWA.

Conceptually:

SwiftUI
   ↓
Swift API client
   ↓
Supabase API
   ↓
GitHub

The Swift app should NOT create a separate backend.

The native app may eventually provide:

* offline caching
* background synchronization
* Share Sheet
* Files integration
* Spotlight
* widgets
* native editing
* native navigation and UI

But these come after the core PWA/API architecture is stable.

⸻

11. Monorepo

The main application will use a monorepo.

Initial structure:

vault/
├── apps/
│   └── web/
│
├── supabase/
│   ├── functions/
│   ├── migrations/
│   └── config.toml
│
├── docs/
│   ├── architecture/
│   ├── api/
│   └── decisions/
│
├── ai/
│   ├── context/
│   ├── prompts/
│   └── workflows/
│
├── openapi/
│   └── openapi.yaml
│
├── .github/
│   └── workflows/
│
├── AGENTS.md
├── package.json
├── pnpm-workspace.yaml
└── README.md

The Swift application can later be added:

apps/
├── web/
└── ios/

We will NOT initially create a packages/ directory unless we actually have shared TypeScript code that deserves to be extracted into packages.

Avoid premature abstraction.

⸻

12. AI-Assisted Development Is a First-Class Part of the Project

AI tooling will be set up from the very beginning, before substantial application development starts.

The AI is not initially a feature of the product.

It is a development system used to build the product faster and with better architectural consistency.

The project should be designed so that a capable coding agent can understand the project without relying on previous chat history.

The repository itself must contain the project’s persistent context.

⸻

13. AI Development Stack

The project will use:

* Coding agent of choice
* Graphify
* MCP
* GitHub tooling
* Supabase tooling
* project documentation
* ADRs
* OpenAPI
* automated tests
* GitHub Actions

The exact coding-agent product is not the architectural dependency.

The repository should remain usable by different coding agents.

⸻

14. Graphify

Graphify will be used from the beginning.

Its purpose is to provide the AI with a structured understanding of the project’s:

* source code
* dependencies
* relationships
* architecture
* documentation

Graphify/MCP should help the AI answer questions such as:

* What depends on this service?
* What will be affected if this API changes?
* How does a note-save request flow through the system?
* Which parts of the PWA depend on this API?
* What architecture components are affected by this PR?

Graphify is an AI navigation/understanding tool.

It is NOT the source of truth.

Git remains the source of truth.

⸻

15. MCP

MCP will be used to expose useful project capabilities/context to the coding agent.

The development environment should eventually allow the agent to access:

Graphify
GitHub
Supabase
Filesystem/project files
Documentation

The goal is to make the AI capable of understanding the whole system instead of merely generating isolated snippets.

⸻

16. Project Documentation as AI Context

Documentation is part of the project’s architecture.

We will maintain:

docs/
├── architecture/
├── api/
└── decisions/

The documentation should explain:

* system architecture
* client/backend boundaries
* GitHub integration
* authentication
* vault format
* synchronization
* API behavior
* security model

This documentation is intended for both humans and AI agents.

⸻

17. AGENTS.md

The root repository will contain:

AGENTS.md

This is the primary project-level instruction file for coding agents.

It should describe:

* what the project is
* architecture
* important rules
* development workflow
* testing requirements
* security requirements
* API rules
* database rules
* dependency rules

Directory-specific instructions may later exist:

apps/web/AGENTS.md
supabase/AGENTS.md
docs/AGENTS.md

These contain rules specific to that part of the repository.

⸻

18. Architectural Decision Records

Important decisions will be recorded as ADRs.

Example:

docs/decisions/
ADR-001-github-is-source-of-truth.md
ADR-002-supabase-responsibilities.md
ADR-003-api-boundary.md
ADR-004-markdown-format.md
ADR-005-pwa-swift-api-contract.md

Each ADR records:

Context
Decision
Consequences
Status

The purpose is to preserve the reasoning behind architectural choices.

This prevents future developers or AI agents from accidentally reversing deliberate decisions.

Example:

If an AI suggests:

Store all Markdown in Supabase.

The project context can tell it that this contradicts the established GitHub-as-source-of-truth architecture.

⸻

19. Rules vs Documentation vs Enforcement

These must remain separate.

Rules

What the AI must follow.

Example:

Never store canonical note content in Supabase.

Documentation

How the system works.

Example:

docs/architecture/github.md

ADRs

Why the architecture was chosen.

Example:

ADR-001

Automated enforcement

What the computer verifies.

Example:

TypeScript
Tests
Lint
OpenAPI validation
Secret scanning
GitHub Actions
Branch protection

The AI should understand the rules, but the AI itself should not be trusted to enforce them.

⸻

20. Important Non-Negotiable Rules

The following principles are core to the project.

Data

1. GitHub is the source of truth.
2. User notes are Markdown files in the user’s private repository.
3. Supabase stores application metadata, not canonical note content.

Security

4. GitHub credentials/tokens must never be exposed to the client.
5. The PWA does not directly perform privileged GitHub API operations.
6. GitHub operations go through the backend/API.
7. Production secrets must never be committed to Git.
8. Development and production credentials must be separated.

API

9. PWA and Swift use the same backend API.
10. API changes require OpenAPI changes.
11. API behavior should be independently testable.

Database

12. Database schema changes require migrations.
13. Do not manually create production schema changes without a migration.

Architecture

14. Significant architecture changes require an ADR.
15. Avoid premature abstractions.
16. Add shared packages only when actual shared code exists.

Quality

17. New functionality requires tests.
18. Broken tests mean the task is not complete.
19. AI-generated code must pass automated checks.
20. main should be protected.

⸻

21. AI Development Workflow

The coding agent should generally follow this process:

Understand
    ↓
Inspect relevant code
    ↓
Read relevant docs/ADRs
    ↓
Use Graphify/MCP where useful
    ↓
Create implementation plan
    ↓
Implement
    ↓
Run tests
    ↓
Review changes
    ↓
Update docs/ADR if architecture changed
    ↓
Create PR

The AI should not blindly modify large parts of the repository without understanding the existing architecture.

For significant tasks, planning should happen before implementation.

⸻

22. Stop Conditions for AI

The AI should stop and ask/flag the issue when:

* an API contract needs to change
* database architecture needs to change
* a significant architectural decision is required
* an existing ADR would be contradicted
* production credentials appear necessary
* a new external dependency is required without justification
* tests cannot be made to pass
* the requested implementation conflicts with project rules

The goal is not to prevent AI from working.

The goal is to prevent AI from silently making architectural decisions that belong to the project owner.

⸻

23. Automated Enforcement

GitHub Actions will act as the main automated quality gate.

A PR should eventually run:

Install
  ↓
Lint
  ↓
Typecheck
  ↓
Unit tests
  ↓
Build
  ↓
Playwright
  ↓
OpenAPI validation
  ↓
Security/secret checks

Branch protection should require the relevant checks to pass before merging.

The philosophy is:

AI proposes and implements. CI verifies. GitHub protects. Humans make important architectural decisions.

⸻

24. Testing

The PWA will eventually use Playwright for important end-to-end flows.

A critical test should look conceptually like:

Login
 ↓
Create vault
 ↓
Create note
 ↓
Edit note
 ↓
Reload
 ↓
Verify note exists

Backend tests should verify:

* authentication
* authorization
* GitHub operations
* invalid input
* error handling
* API contracts

⸻

25. GitHub Actions

GitHub Actions will eventually handle:

* CI
* tests
* linting
* typechecking
* builds
* API validation
* vault validation
* metadata/index generation
* other asynchronous automation

Potential future workflow:

User commits Markdown
        ↓
GitHub Actions
        ↓
Validate vault
        ↓
Process metadata
        ↓
Generate index

⸻

26. Offline and Synchronization

After the basic application works, the PWA should gain offline capabilities.

Conceptually:

GitHub
   ↕
API
   ↕
Sync engine
   ↕
IndexedDB
   ↕
PWA

Later the Swift app can use a similar local-cache/synchronization architecture.

Conflict resolution is a later feature.

Do not build sophisticated sync before basic CRUD functionality is stable.

⸻

27. AI Features Inside the Product

AI inside the actual vault is a later phase.

Potential future features:

* semantic search
* related notes
* automatic backlinks
* knowledge graph
* note summarization
* “Ask my vault”
* relationship discovery
* AI-assisted organization

Potential future technologies include:

* GraphRAG
* Graphiti
* embeddings
* vector/semantic search
* knowledge graphs

These should NOT be introduced into the MVP merely because they are interesting.

The underlying Markdown vault must remain useful without AI.

⸻

28. Development Phases

Phase 0 — AI Engineering Environment

Before substantial application code:

1. Create main GitHub repository.
2. Create AGENTS.md.
3. Establish repository structure.
4. Define initial architecture.
5. Create ADR system.
6. Create initial OpenAPI contract.
7. Set up Graphify.
8. Set up MCP.
9. Set up AI context/workflows.
10. Set up GitHub Actions.
11. Protect main.

This phase establishes the environment in which the AI will build the project.

⸻

Phase 1 — PWA

Build:

* React
* TypeScript
* Vite
* routing
* basic UI
* PWA foundation
* Vercel deployment

Initially use mock data where useful.

⸻

Phase 2 — Supabase Backend

Build:

* GitHub authentication
* Supabase project
* database metadata
* Edge Functions
* API foundation

⸻

Phase 3 — GitHub Vault

Implement:

* create private vault
* create file
* read file
* update file
* delete file
* list files
* Git commits
* repository/template handling

⸻

Phase 4 — Working Notes Application

Build the actual note experience:

* file tree
* Markdown editor
* preview
* note creation
* editing
* deletion
* basic search

⸻

Phase 5 — Testing & CI

Strengthen:

* unit tests
* API tests
* Playwright
* GitHub Actions
* security checks
* branch protection
* contract validation

⸻

Phase 6 — Offline & Sync

Add:

* IndexedDB
* offline reading
* offline editing
* queued changes
* synchronization
* conflict detection

⸻

Phase 7 — Swift/iOS

Build the native iOS client using:

* Swift
* SwiftUI
* SwiftData where appropriate
* the same API contract

⸻

Phase 8 — Intelligent Vault

Only after the core platform is stable:

* semantic search
* knowledge graph
* Graphiti/GraphRAG
* automatic links
* AI queries
* intelligent organization

⸻

29. MVP Definition

The MVP is complete when:

A new user can authenticate with GitHub, create a private vault from our template, create/edit/delete Markdown notes through the PWA, and have those changes persist as commits in their own private GitHub repository.

Everything else is secondary.

⸻

30. Cost Goal

The target is ₹0 for the initial project.

Planned services:

GitHub      → Free tier
Vercel      → Free tier
Supabase    → Free tier
GitHub      → Actions/free allowances
Graphify    → Local/development tooling where applicable
Open source tooling → Prefer whenever practical

The architecture should avoid dependence on paid infrastructure.

Free-tier limits should always be respected, and production-scale usage may eventually require paid services.

The project should also remain portable so that no single provider becomes an irreversible dependency.

⸻

31. Final Architecture

The intended architecture is:

                         USER
                          │
             ┌────────────┴────────────┐
             │                         │
             ▼                         ▼
          PWA/Web                 Swift/iOS
             │                         │
             └────────────┬────────────┘
                          │
                          ▼
                 Supabase API Layer
                          │
                 ┌────────┴────────┐
                 │                 │
              Auth            Edge Functions
                                   │
                                   ▼
                              GitHub API
                                   │
                                   ▼
                       User's Private Repository
                                   │
                     ┌─────────────┼─────────────┐
                     │             │             │
                  Markdown       Assets      Git History

Around the development process:

                       Coding Agent
                            │
              ┌─────────────┼─────────────┐
              │             │             │
          Graphify         MCP         AGENTS.md
              │             │             │
              └─────────────┼─────────────┘
                            │
                   Docs + ADRs + OpenAPI
                            │
                            ▼
                         Code
                            │
                            ▼
                           PR
                            │
                    GitHub Actions
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
              Tests       Lint        Build
                │           │           │
                └───────────┼───────────┘
                            ▼
                       Protected main

⸻

32. Final Project Philosophy

The project follows these principles:

User-owned data

The user’s vault belongs to the user.

Open formats

Markdown and Git remain understandable without our application.

API-first

The PWA and native app consume the same backend contract.

AI-first development

AI tooling, Graphify, MCP, documentation and architectural context exist from the beginning.

AI is not the authority

AI helps build the project, but tests, CI, contracts, Git and architectural decisions remain authoritative.

Architecture is documented

Important decisions are recorded in ADRs rather than living only in conversations.

Automation enforces rules

Rules that can be mechanically verified should be enforced by CI rather than merely written in prompts.

Start simple

Do not build synchronization, knowledge graphs, semantic search or AI features before the fundamental Git-backed vault works.

Zero-cost first

Use free tiers and open-source tooling while designing the system so that paid infrastructure can be introduced later without rewriting the entire application.

⸻

Final Decision

This is the architecture we are committing to.

We are not continuing to redesign the fundamental architecture unless implementation reveals a concrete technical problem.

The starting point is therefore:

GitHub + Supabase + Vercel + React/Vite PWA + future SwiftUI app + OpenAPI + GitHub Actions + Graphify + MCP + ADRs + AI development rules.

The first thing to build is Phase 0: the AI-assisted engineering environment and project foundation, followed by the PWA and backend.

The project should be treated as a long-lived open-source-quality engineering project rather than a throwaway prototype.