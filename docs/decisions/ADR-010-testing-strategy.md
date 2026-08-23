# ADR 010: Testing Strategy

## Status
Accepted

## Context
As the codebase for Aetherius grows, maintaining stability and preventing regressions across the frontend UI, local offline persistence, intelligence parsing, and the backend Supabase Edge Functions becomes critical. We needed to establish a standard testing infrastructure that is fast, reliable, and easily integratable into GitHub Actions CI. 

Specifically, we needed testing for:
1. React frontend components and hooks (PWA).
2. Pure logic services (Markdown parsing, Knowledge Graph indexing).
3. Backend API boundaries (Supabase Edge Functions).

## Decision
We have decided to adopt the following testing strategy and toolchain:

### Frontend (React & Services)
- **Framework**: Vitest (replacing Jest) for fast, Vite-native execution.
- **Environment**: `jsdom` for mocking the browser environment.
- **Component Testing**: React Testing Library (`@testing-library/react` and `@testing-library/jest-dom`) for semantic, accessibility-focused UI testing.
- **Coverage Tooling**: `@vitest/coverage-v8` to enforce a minimum baseline of 80% coverage across critical paths.

### Backend (Supabase Edge Functions)
- **Framework**: Deno's native test runner (`Deno.test`).
- **Assertions/Mocking**: `https://deno.land/std/testing/` modules for stubbing the `Deno.serve` entry points to test Request/Response chains without deploying.

### Coverage Targets
- We aim for **80%+ statement and branch coverage** minimum on all logical systems, hooks, and complex UI components.
- The repository enforces these targets using the automated CI pipelines before any code is merged to the main branch.

## Consequences
- **Positive**: We have a unified, extremely fast testing setup for the frontend utilizing Vite's existing config. Code regressions in critical components (like offline synchronization or markdown parsing) are heavily mitigated. 
- **Positive**: Deno edge functions can be safely unit-tested locally without requiring a full Docker/Supabase local instance.
- **Negative**: Developers must maintain mock setups for `offlineDb` (IndexedDB) and `vaultService` in the frontend test environment, adding slight overhead to creating new components.

## Notes
- Fake IndexedDB (`fake-indexeddb`) is used to test the offline storage engine without a real browser.
- CI pipelines are configured to run `pnpm test` ensuring both React and Node logic executes properly in Ubuntu environments.
