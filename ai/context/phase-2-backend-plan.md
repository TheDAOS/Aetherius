# Phase 2 Implementation Plan — Supabase Backend

## 1. Overview & Objectives

Phase 2 focuses on establishing the application's backend infrastructure using Supabase. The goal is to set up authentication, application metadata storage, and the Edge Functions API layer that will intermediate between the client applications and GitHub. 

Crucially, **GitHub remains the source of truth for all Markdown content.** The database will only store application metadata (such as vault configuration), and the Edge Functions will serve as a secure proxy to GitHub APIs to fulfill the OpenAPI contract.

## 2. Step-by-Step Execution Sequence

### **Step 1 — Supabase Local Environment Setup**
- Initialize a local Supabase environment (`supabase init`).
- Configure `supabase/config.toml` for local development.
- Add Supabase CLI to `pnpm` workspace scripts for easier commands.

### **Step 2 — Database Schema & RLS (Migrations)**
- Create a migration for the `vaults` table to store metadata (e.g., `id`, `user_id`, `github_owner`, `github_repo`, `branch`, `created_at`).
- Establish PostgreSQL Row-Level Security (RLS) policies to ensure users can only read and mutate their own vault metadata.

### **Step 3 — Authentication Integration**
- Document GitHub OAuth configuration requirements.
- Add `@supabase/supabase-js` to the `apps/web/` PWA.
- Implement a React Context in the PWA to manage the user session and login/logout UI.

### **Step 4 — Edge Functions Scaffolding**
- Initialize the Deno environment for Edge Functions.
- Scaffold a core routing Edge Function corresponding to the `openapi.yaml` contract (e.g., `api-v1`).
- Implement basic JWT verification for Edge Functions using the Supabase auth context.

### **Step 5 — Verification & Quality Checks**
- Ensure `supabase start` succeeds locally.
- Verify that migrations apply cleanly to the local Postgres instance.
- Ensure the PWA can successfully initiate a sign-in flow and retrieve a session.

## 3. Adherence to Rules & Constraints
- **AGENTS.md #1 & #3**: We will NOT create tables for note content. `vaults` will only hold metadata.
- **AGENTS.md #4 & Security Rules**: GitHub operations will not occur on the client. Edge Functions will handle GitHub API interactions.
- **AGENTS.md #7**: Database changes will exclusively use the `supabase/migrations` directory.

## 4. Next Actions
Upon approval, I will proceed with **Step 1 and Step 2**: initializing the Supabase local project and creating the initial database migrations.
