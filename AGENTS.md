# AGENTS.md

## Project Identity

This repository contains a Git-backed personal knowledge vault application.

The application provides interfaces for creating, editing, organizing, searching, and eventually intelligently exploring Markdown notes stored in a user's private GitHub repository.

The project consists of:

- A React/TypeScript/Vite Progressive Web App.
- A Supabase backend and API layer.
- GitHub-backed Markdown vaults.
- A future native iOS application using Swift/SwiftUI.
- An AI-assisted development environment using repository documentation, ADRs, Graphify, MCP, and automated CI.

The project is intended to remain free/zero-cost during initial development and should prefer free tiers and open-source tooling wherever practical.

---

# Core Architecture

The fundamental architecture is:

```text
PWA ───────────┐
               │
               ▼
        Supabase API Layer
               │
               ▼
          Edge Functions
               │
               ▼
           GitHub API
               │
               ▼
      User's Private Repository
```

The future Swift/iOS client uses the same backend API:

```text
PWA ───────────┐
               │
               ▼
        Common Backend API
               ▲
               │
Swift/iOS ─────┘
```

The user's private GitHub repository is the canonical source of truth for vault contents.

---

# Non-Negotiable Rules

## 1. GitHub Is the Source of Truth

User vault contents must remain canonical Markdown/files in the user's private GitHub repository.

Do not make Supabase, the PWA, IndexedDB, or any other application storage layer the canonical owner of note content.

Local caches may exist for performance or offline functionality, but they must remain derived state.

---

## 2. Markdown Is the Canonical Note Format

Notes must remain ordinary Markdown files.

Do not introduce a proprietary note-storage format that prevents users from accessing their data outside this application.

Frontmatter may be used where appropriate, but Markdown remains the canonical format.

---

## 3. Supabase Is Not Canonical Note Storage

Supabase is responsible for application infrastructure such as:

- Authentication.
- User/session management.
- Vault metadata.
- API/Edge Functions.
- Application metadata.
- Other explicitly approved backend responsibilities.

Do not store canonical Markdown note contents in Supabase.

Any architectural change to this rule requires an ADR and explicit project-owner approval.

---

## 4. Clients Must Not Perform Privileged GitHub Operations

The PWA and future Swift application must not directly perform privileged GitHub repository operations using backend credentials.

The intended flow is:

```text
Client
  ↓
Supabase API / Edge Function
  ↓
GitHub API
  ↓
User Repository
```

Never expose GitHub credentials, access tokens, service credentials, or other privileged secrets to the client.

---

## 5. PWA and Swift Must Use the Same API

The PWA and future Swift/iOS application must consume the same backend API contract.

Do not create a separate backend specifically for the iOS application.

The OpenAPI specification is the canonical API contract.

---

## 6. OpenAPI Must Stay in Sync

The API is defined in:

```text
openapi/openapi.yaml
```

Any API change must update the OpenAPI contract.

Do not silently change request/response behavior without updating the contract.

API behavior should be independently testable.

---

## 7. Database Changes Require Migrations

Database schema changes must be represented by migrations.

Do not manually modify production database schemas without a corresponding migration.

Database architecture changes require appropriate documentation and, when significant, an ADR.

---

## 8. Avoid Premature Abstraction

Do not create abstractions merely because code might eventually be shared.

Do not create a `packages/` directory unless actual shared code exists that justifies it.

Prefer simple, local implementations until a real reuse boundary becomes apparent.

---

## 9. Do Not Introduce Unnecessary Dependencies

Before adding a dependency:

1. Determine whether the functionality already exists in the project.
2. Determine whether the platform/runtime already provides the required capability.
3. Consider the dependency's maintenance, security, size, and licensing implications.
4. Explain why the dependency is necessary.
5. Prefer established, actively maintained, open-source dependencies.

Do not add libraries merely for convenience when a simple implementation is sufficient.

---

## 10. Keep the MVP Simple

Do not prematurely implement:

- GraphRAG.
- Graphiti.
- Vector databases.
- Embeddings.
- Semantic search.
- Knowledge graphs.
- Sophisticated synchronization.
- Conflict-resolution engines.
- Native iOS application.
- Elaborate component libraries.
- AI features inside the product.

These are later phases.

The first objective is a reliable Git-backed Markdown vault.

---

# Repository Structure

The intended initial repository structure is:

```text
vault/
├── apps/
│   └── web/
├── supabase/
├── docs/
│   ├── architecture/
│   ├── api/
│   └── decisions/
├── ai/
│   ├── context/
│   ├── prompts/
│   └── workflows/
├── openapi/
├── .github/
│   └── workflows/
├── AGENTS.md
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

Do not introduce additional top-level architecture without a clear reason.

---

# Documentation Rules

Documentation has three distinct purposes.

## AGENTS.md

Defines:

> What must I follow?

This file contains project rules and constraints.

---

## docs/

Defines:

> How does the system work?

Architecture documentation should explain implementation and system behavior.

---

## ADRs

Defines:

> Why did we make this decision?

Significant architectural decisions must be recorded in:

```text
docs/decisions/
```

Do not use AGENTS.md as a substitute for architecture documentation or ADRs.

---

# Architecture Documentation

Relevant documentation should be consulted before modifying architectural areas.

Expected architecture documentation includes:

```text
docs/architecture/
├── overview.md
├── data-flow.md
├── authentication.md
├── github.md
├── supabase.md
└── security.md
```

When architecture changes, update the relevant documentation.

---

# ADR Rules

Significant architectural changes require an ADR.

Examples include:

- Changing the source of truth.
- Changing the API boundary.
- Changing responsibilities between Supabase and GitHub.
- Introducing a new persistence layer.
- Introducing a major synchronization strategy.
- Introducing a major external service.
- Changing the client/backend architecture.

Before making such a change:

1. Inspect existing ADRs.
2. Determine whether the proposed change conflicts with an accepted decision.
3. If it does, stop and flag the conflict.
4. Do not silently reverse an accepted architectural decision.

---

# AI Development Workflow

Coding agents should generally follow this workflow:

```text
Understand
    ↓
Inspect relevant code
    ↓
Read relevant documentation
    ↓
Read relevant ADRs
    ↓
Use Graphify/MCP where useful
    ↓
Create implementation plan
    ↓
Implement
    ↓
Run tests/checks
    ↓
Review changes
    ↓
Update documentation if necessary
    ↓
Update ADR if architecture changed
    ↓
Create PR
```

Do not blindly modify large portions of the repository.

Understand the existing architecture before making changes.

---

# AI Context

The repository itself must contain enough context for a coding agent to understand the project without relying on previous chat history.

Agents should use, where available:

- `AGENTS.md`
- Architecture documentation.
- ADRs.
- OpenAPI.
- Graphify.
- MCP.
- Existing source code.
- Tests.
- CI configuration.

Graphify and MCP are development tools.

They are not sources of truth.

Git, source code, contracts, tests, and accepted architectural decisions remain authoritative.

---

# Planning Requirements

For small, localized changes, implementation may proceed directly when the architecture is clearly understood.

For significant changes, the agent should first produce an implementation plan covering:

- Relevant files.
- Existing architecture involved.
- Proposed changes.
- Tests required.
- Documentation changes.
- Potential architectural implications.

Do not begin a significant implementation while important architectural questions remain unresolved.

---

# Testing Requirements

New functionality should include appropriate tests.

Depending on the change, this may include:

- Unit tests.
- Integration tests.
- API tests.
- Contract tests.
- End-to-end tests.
- Security tests.

A task is not complete merely because the implementation compiles.

The relevant automated checks must pass.

Broken or failing tests must not be ignored.

---

# CI Requirements

GitHub Actions is the automated quality gate.

The project will progressively enforce:

```text
Install
  ↓
Lint
  ↓
Typecheck
  ↓
Tests
  ↓
Build
  ↓
End-to-end tests
  ↓
OpenAPI validation
  ↓
Security/secret checks
```

Do not bypass failing CI checks merely to make a PR mergeable.

If a check is incorrect, fix the check or explicitly flag the problem.

---

# Security Rules

Never commit:

- API keys.
- GitHub access tokens.
- Supabase service-role keys.
- Private keys.
- Passwords.
- Production credentials.
- User secrets.
- `.env` files containing real secrets.

Use environment variables or the appropriate secret-management mechanism.

Development and production credentials must remain separate.

Never expose privileged backend credentials to the PWA or future Swift application.

Treat user vault contents as private data.

Do not log sensitive credentials or unnecessary private vault contents.

---

# API Rules

All API endpoints must:

- Follow the versioned API structure.
- Be represented in OpenAPI.
- Validate input.
- Enforce authentication where required.
- Enforce authorization.
- Return predictable errors.
- Avoid leaking sensitive information.
- Be independently testable.

The intended API namespace begins with:

```text
/v1/
```

Do not introduce an incompatible API design without documenting the decision.

---

# GitHub Integration Rules

GitHub is the persistence layer for canonical vault contents.

GitHub operations should be performed through the backend API.

The backend must respect repository ownership and authorization boundaries.

Never assume that a user has access to a repository merely because its name or owner is known.

Validate authorization before performing repository operations.

---

# Database Rules

Supabase/Postgres should contain application metadata rather than canonical Markdown note content.

Database changes must use migrations.

Do not duplicate GitHub vault state into the database unless there is a documented reason and clear distinction between canonical and derived data.

Derived indexes or metadata must never silently become the source of truth.

---

# Dependency Rules

Dependencies should be:

- Necessary.
- Justified.
- Maintained.
- Compatible with the project's licensing requirements.
- Reasonable for the project's zero-cost development goal.

Avoid dependency proliferation.

Do not introduce major infrastructure merely because it may be useful in a future phase.

---

# Git Rules

Keep commits focused.

Do not mix unrelated changes into a single commit.

Do not rewrite shared history unless explicitly requested.

Do not commit generated secrets or local machine configuration.

The `main` branch is intended to be protected.

Normal development should happen through branches and pull requests once branch protection is established.

---

# When the Agent Must Stop and Ask

The agent must stop and flag the issue rather than silently deciding when:

1. An API contract needs a breaking or significant change.
2. Database architecture needs to change.
3. A significant architectural decision is required.
4. An accepted ADR would be contradicted.
5. Production credentials appear necessary.
6. A new external service is required.
7. A major dependency is required without clear justification.
8. The requested implementation conflicts with these rules.
9. Tests cannot reasonably be made to pass.
10. The source-of-truth model would need to change.
11. A new persistence mechanism is being proposed.
12. The agent is unsure whether a change is architectural or merely implementation detail.

The agent may propose alternatives, but must not silently make important architectural decisions on behalf of the project owner.

---

# Definition of Done

A change is generally complete when:

- The implementation satisfies the requested behavior.
- Existing architecture rules are respected.
- Appropriate tests exist.
- Relevant tests pass.
- Lint/typecheck/build checks pass where applicable.
- OpenAPI is updated when the API changes.
- Documentation is updated when behavior or architecture changes.
- An ADR is added or updated when a significant architectural decision is involved.
- No secrets are introduced.
- The change is ready for review.

---

# Project Philosophy

The project follows these principles:

### User-owned data

The user's vault belongs to the user.

### Open formats

Markdown and Git remain understandable without this application.

### API-first

The PWA and native application use the same backend contract.

### AI-assisted development

AI is a first-class development tool supported by repository context, Graphify, MCP, documentation, ADRs, and CI.

### AI is not the authority

AI proposes and implements.

The repository verifies.

Humans make important architectural decisions.

### Documented architecture

Important decisions must not exist only in chat history.

### Automated enforcement

Rules that can be mechanically verified should be enforced by CI.

### Start simple

Build the fundamental Git-backed vault before adding sophisticated synchronization or intelligence.

### Zero-cost first

Prefer free tiers and open-source tooling during initial development while keeping the architecture portable.

---

# Final Authority

When sources disagree, use this order of authority:

1. Explicit project-owner decisions.
2. Accepted ADRs.
3. `AGENTS.md` rules.
4. OpenAPI contract.
5. Automated tests and CI.
6. Architecture documentation.
7. Existing implementation.
8. Agent assumptions.

If two authoritative project artifacts conflict, do not silently choose one.

Stop, identify the conflict, and request a decision.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
