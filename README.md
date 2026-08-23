# Aetherius

# Git-Backed Personal Vault

A Git-backed personal knowledge vault built around Markdown and GitHub.

### Architecture

- React + TypeScript + Vite PWA
- Supabase
- GitHub API
- OpenAPI
- Future SwiftUI client

GitHub is the source of truth for vault data.
### Project Status
- [x] **Phase 1**: Frontend PWA Scaffold & UI Components
- [x] **Phase 2**: Supabase Backend & GitHub Authentication
- [x] **Phase 3**: Offline Storage, Synchronization & Core Testing Infrastructure
- [ ] **Phase 4**: GitHub REST API Integration & Vault Operations
- [ ] **Phase 5**: Advanced Features & Native iOS App

### Testing
- Frontend: Vitest + React Testing Library (`pnpm test` in `apps/web`)
- Backend: Deno native test runner (`deno test` in `supabase/functions/api-v1`)
