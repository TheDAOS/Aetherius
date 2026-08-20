# Phase 3 Implementation Plan — GitHub Vault

## 1. Overview & Objectives

Phase 3 transitions the application from a mock API layer to the real Git-backed Markdown vault. The goal is to implement the core GitHub operations (create vault, file CRUD, list files) inside the Supabase Edge Functions.

Crucially, **GitHub remains the source of truth for all Markdown content.** The database only stores metadata. The PWA must not perform privileged GitHub repository operations directly; everything must go through the Supabase Edge Functions which proxy the requests to GitHub's REST API.

## 2. Step-by-Step Execution Sequence

### **Step 1 — GitHub Integration & Auth Flow**
- Configure the GitHub OAuth App / GitHub App credentials in Supabase.
- Ensure the user's GitHub access token is securely stored and accessible by the Edge Functions.
- Implement helper utilities in the Edge Functions to perform authenticated calls to the GitHub API on behalf of the user.

### **Step 2 — Vault Initialization (`POST /v1/vault`)**
- Update `openapi/openapi.yaml` to include a `POST /v1/vault` endpoint if not already present.
- Implement the Edge Function handler to:
  - Create a private repository in the user's GitHub account (optionally using a template).
  - Create the initial `vaults` database record in Supabase to track the metadata (repository name, owner, branch).

### **Step 3 — File System Endpoints (GitHub Contents API)**
- **`GET /v1/files`**: Fetch the repository tree/contents from GitHub and map it to the `FileList` OpenAPI schema.
- **`POST /v1/files`**: Create a new Markdown file via the GitHub Contents API (requires a commit message).
- **`GET /v1/files/{path}`**: Fetch file contents and metadata from GitHub.
- **`PUT /v1/files/{path}`**: Update an existing file via the GitHub Contents API (requires providing the previous blob `sha` and a commit message).
- **`DELETE /v1/files/{path}`**: Delete a file via the GitHub Contents API.

### **Step 4 — Edge Function Routing & Refinement**
- Implement route parsing in the Deno Edge Function to correctly map `api-v1` paths to the GitHub handlers.
- Ensure robust error handling (e.g., mapping GitHub 404s or 409s to appropriate REST responses).
- Format commit messages cleanly (e.g., "Update note: {filename} via Aetherius").

### **Step 5 — PWA Integration & Verification**
- Swap the PWA's mock API client for the real Edge Function endpoints.
- Test the full lifecycle: logging in, initializing the vault, creating a note, editing it, and deleting it.
- Verify that the Markdown files appear correctly in the user's private GitHub repository.

## 3. Adherence to Rules & Constraints
- **AGENTS.md #1 & #3**: Canonical note contents remain strictly in GitHub. The Supabase `vaults` table only stores repository metadata.
- **AGENTS.md #4 & Security Rules**: All GitHub API calls are made from the Edge Functions. The PWA receives no GitHub tokens directly.
- **AGENTS.md #5 & #6**: The PWA and Edge Functions must adhere exactly to `openapi/openapi.yaml`. Any endpoint changes (like adding `POST /v1/vault`) must be documented in the OpenAPI spec first.
- **AGENTS.md #7**: If `vaults` schema needs adjustments for tracking repo ID/metadata, a new migration must be created.

## 4. Definition of Done
Phase 3 is complete when a user can sign in, initialize a vault, and manage their Markdown notes seamlessly from the PWA, with all changes accurately reflected as commits in their private GitHub repository.
