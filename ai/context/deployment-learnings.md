# Deployment Learnings & Workarounds

This document captures environment-specific deployment requirements and workarounds discovered during the initial Phase 3 production rollout. It serves as context for future automated or manual deployments.

## 1. Supabase CLI Edge Function Bundling
The standard `pnpm dlx supabase functions deploy` command attempts to bundle Deno edge functions locally using a Docker container.
* **Issue:** On some local environments (particularly Linux desktop with restricted Docker mount permissions or snap installations), the local Docker container fails to mount the host repository path, causing Deno to throw `Error: entrypoint path does not exist`.
* **Fix/Workaround:** Bypass the local Docker bundling step and have Supabase bundle it server-side using the `--use-api` flag:
  ```bash
  pnpm exec supabase functions deploy api-v1 --use-api
  ```

## 2. Vercel `ERR_INVALID_THIS` (pnpm + Node 20/22 mismatch)
Vercel defaults to Node 20/22. If the project does not explicitly specify the `packageManager` version, Vercel falls back to an older default `pnpm` version that contains a `URLSearchParams` bug (`ERR_INVALID_THIS`) when running on Node 20+.
* **Issue:** Vercel fails during the dependency installation phase with `ERR_PNPM_META_FETCH_FAIL GET https://registry.npmjs.org/...: Value of "this" must be of type URLSearchParams`.
* **Fix/Workaround:** Explicitly set the `packageManager` field in the root `package.json`. Because we are using a monorepo setup where Vercel's *Root Directory* is set to `apps/web`, we must ALSO add the `packageManager` field to `apps/web/package.json` so that Vercel detects it correctly before running `pnpm install`.
  ```json
  "packageManager": "pnpm@11.22.0"
  ```
  *(Do NOT override the Vercel Install Command manually to `npm install -g pnpm`, as this breaks Vercel's automatic monorepo dependency linking and causes `tsc: command not found` errors downstream).*

## 3. GitHub Actions `pnpm/action-setup` Conflict
When using `pnpm/action-setup` in GitHub Actions, if you hardcode the `version` (e.g., `version: 10`) while also defining the `packageManager` field in `package.json`, the CI will fail with a "Multiple versions of pnpm specified" error.
* **Fix/Workaround:** Remove the explicit `version` argument from the `.github/workflows/ci.yml` file. Let the setup action dynamically detect and inherit the version specified in the `package.json`'s `packageManager` field.

## 4. Vite Environment Variables
* **Issue:** Using `import.meta.env.VITE_*` inside `apps/web` can throw TypeScript errors (`Property 'env' does not exist on type 'ImportMeta'`).
* **Fix/Workaround:** Ensure a `vite-env.d.ts` file exists in `apps/web/src/` with the reference to the Vite client types:
  ```typescript
  /// <reference types="vite/client" />
  ```
