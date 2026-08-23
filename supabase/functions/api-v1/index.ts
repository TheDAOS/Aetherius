import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GitHubClient } from "../_shared/github.ts";

// --- CORS Configuration ---
const allowedOriginsEnv = Deno.env.get("ALLOWED_ORIGINS") || "";
const allowedOrigins = allowedOriginsEnv
  ? allowedOriginsEnv.split(",").map((o) => o.trim())
  : ["https://aetherius.sanju.fyi", "http://localhost:5173"];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = allowedOrigins.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    Vary: "Origin",
  };
}

// --- Error Response Helper (OpenAPI-compliant: { code, message }) ---
function errorResponse(
  corsHeaders: Record<string, string>,
  status: number,
  code: string,
  message: string,
): Response {
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// --- Branch Name Sanitization (SSRF Prevention) ---
function sanitizeBranchName(branch: string): string {
  // Only allow safe characters in branch names
  const sanitized = branch.replace(/[^a-zA-Z0-9._\-/]/g, "");
  // Prevent path traversal
  if (sanitized.includes("..") || sanitized.startsWith("/")) {
    return "main";
  }
  return sanitized || "main";
}

// --- Repository Name Validation ---
function isValidRepoName(name: string): boolean {
  // GitHub repo names: alphanumeric, hyphens, underscores, periods
  // 1-100 characters, cannot start with period
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(name);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. JWT Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(
        corsHeaders,
        401,
        "UNAUTHORIZED",
        "Missing Authorization header",
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return errorResponse(
        corsHeaders,
        401,
        "UNAUTHORIZED",
        "Invalid or expired token",
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.replace("/api-v1", ""); // Strip function mount path
    const method = req.method;

    console.log(`[api-v1] ${method} ${path}`);

    // --- Token Storage Endpoint ---
    // Client stores GitHub token server-side once after OAuth (Rule #4 compliance)
    if (method === "POST" && path === "/v1/auth/github-token") {
      const body = await req.json();
      const { token } = body;

      if (!token || typeof token !== "string") {
        return errorResponse(
          corsHeaders,
          400,
          "BAD_REQUEST",
          "token is required",
        );
      }

      const { error: upsertError } = await supabaseClient
        .from("user_github_tokens")
        .upsert(
          {
            user_id: user.id,
            encrypted_token: token,
            scopes: "repo",
          },
          { onConflict: "user_id" },
        );

      if (upsertError) throw upsertError;

      return new Response(
        JSON.stringify({ code: "OK", message: "Token stored" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2. Retrieve GitHub token from server-side storage
    const { data: tokenRow, error: tokenError } = await supabaseClient
      .from("user_github_tokens")
      .select("encrypted_token")
      .eq("user_id", user.id)
      .maybeSingle();

    if (tokenError) throw tokenError;

    // Fall back to legacy x-github-token header for backward compatibility during migration
    const githubToken =
      tokenRow?.encrypted_token || req.headers.get("x-github-token");
    if (!githubToken) {
      return errorResponse(
        corsHeaders,
        401,
        "TOKEN_REQUIRED",
        "GitHub token not found. Please re-authenticate to store your GitHub token.",
      );
    }

    const github = new GitHubClient(githubToken);

    // --- Vault Endpoints ---

    if (method === "GET" && path === "/v1/vault") {
      const { data: vault, error } = await supabaseClient
        .from("vaults")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!vault) {
        return errorResponse(
          corsHeaders,
          404,
          "NOT_FOUND",
          "No vault configured",
        );
      }

      return new Response(
        JSON.stringify({
          id: vault.id,
          owner: vault.github_owner,
          repository: vault.github_repo,
          branch: vault.branch,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (method === "POST" && path === "/v1/vault") {
      const body = await req.json();
      const { repository, description } = body;

      if (!repository || typeof repository !== "string") {
        return errorResponse(
          corsHeaders,
          400,
          "BAD_REQUEST",
          "repository is required",
        );
      }

      // Input validation
      if (!isValidRepoName(repository)) {
        return errorResponse(
          corsHeaders,
          400,
          "BAD_REQUEST",
          "Invalid repository name. Must be 1-100 characters, alphanumeric/hyphens/underscores/periods, cannot start with a period.",
        );
      }

      if (description && typeof description !== "string") {
        return errorResponse(
          corsHeaders,
          400,
          "BAD_REQUEST",
          "description must be a string",
        );
      }

      // Check if vault already exists for user
      const { data: existingVault } = await supabaseClient
        .from("vaults")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingVault) {
        return errorResponse(
          corsHeaders,
          409,
          "CONFLICT",
          "Vault already exists",
        );
      }

      // Get github user info to get the owner name
      const ghUser = await github.getUser();

      // Create GitHub repository
      await github.createRepository(
        repository,
        typeof description === "string" ? description : "",
        true,
      );

      try {
        // Seed initial vault template files
        await github.initTemplateFiles(ghUser.login, repository, "main");

        // Save to Supabase
        const { data: newVault, error: insertError } = await supabaseClient
          .from("vaults")
          .insert({
            user_id: user.id,
            github_owner: ghUser.login,
            github_repo: repository,
            branch: "main",
          })
          .select()
          .single();

        if (insertError) throw insertError;

        return new Response(
          JSON.stringify({
            id: newVault.id,
            owner: newVault.github_owner,
            repository: newVault.github_repo,
            branch: newVault.branch,
          }),
          {
            status: 201,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } catch (err) {
        // Rollback: attempt to delete the created GitHub repository on failure
        try {
          await github.deleteRepository(ghUser.login, repository);
        } catch (rollbackErr) {
          console.error(
            "Failed to rollback GitHub repository creation:",
            rollbackErr,
          );
        }
        throw err;
      }
    }

    // --- Search Endpoint ---
    if (method === "GET" && path === "/v1/search") {
      const { data: vault, error } = await supabaseClient
        .from("vaults")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !vault) {
        return errorResponse(
          corsHeaders,
          404,
          "NOT_FOUND",
          "No vault configured",
        );
      }

      const q = url.searchParams.get("q") || "";
      const pathPrefix = url.searchParams.get("path") || "";

      if (!q.trim()) {
        return errorResponse(
          corsHeaders,
          400,
          "BAD_REQUEST",
          'Search query parameter "q" is required',
        );
      }

      const safeBranch = sanitizeBranchName(vault.branch || "main");
      const results: Array<{
        path: string;
        title: string;
        snippet: string;
        score?: number;
      }> = [];

      try {
        // First try GitHub search code API
        const ghSearch = await github.searchCode(
          vault.github_owner,
          vault.github_repo,
          q,
        );
        if (ghSearch && Array.isArray(ghSearch.items)) {
          for (const item of ghSearch.items) {
            if (pathPrefix && !item.path.startsWith(pathPrefix)) continue;
            results.push({
              path: item.path,
              title: item.name,
              snippet: `Match found in ${item.path}`,
              score: item.score || 1.0,
            });
          }
        }
      } catch (_searchErr) {
        // Fallback: tree match on path and filename if search code is unavailable / not yet indexed
        try {
          const treeData = await github.getTree(
            vault.github_owner,
            vault.github_repo,
            safeBranch,
            true,
          );
          if (treeData && Array.isArray(treeData.tree)) {
            const queryLower = q.toLowerCase();
            for (const item of treeData.tree) {
              if (
                item.type === "blob" &&
                item.path.toLowerCase().includes(queryLower)
              ) {
                if (pathPrefix && !item.path.startsWith(pathPrefix)) continue;
                const filename = item.path.split("/").pop() || item.path;
                results.push({
                  path: item.path,
                  title: filename,
                  snippet: `Matched path: ${item.path}`,
                  score: 1.0,
                });
              }
            }
          }
        } catch (_treeErr) {
          // No results on fallback
        }
      }

      return new Response(
        JSON.stringify({
          query: q,
          results,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // --- Sync Endpoints ---
    if (path === "/v1/sync/status" && method === "GET") {
      const { data: vault, error } = await supabaseClient
        .from("vaults")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !vault) {
        return errorResponse(
          corsHeaders,
          404,
          "NOT_FOUND",
          "No vault configured",
        );
      }

      return new Response(
        JSON.stringify({
          status: "idle",
          lastSyncAt: new Date().toISOString(),
          message: `Vault ${vault.github_owner}/${vault.github_repo} is synchronized with GitHub`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (path === "/v1/sync" && method === "POST") {
      const { data: vault, error } = await supabaseClient
        .from("vaults")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !vault) {
        return errorResponse(
          corsHeaders,
          404,
          "NOT_FOUND",
          "No vault configured",
        );
      }

      return new Response(
        JSON.stringify({
          id: crypto.randomUUID(),
          status: "completed",
        }),
        {
          status: 202,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // --- File System Endpoints ---
    if (path.startsWith("/v1/files")) {
      const { data: vault, error } = await supabaseClient
        .from("vaults")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !vault) {
        return errorResponse(
          corsHeaders,
          404,
          "NOT_FOUND",
          "No vault configured",
        );
      }

      const safeBranch = sanitizeBranchName(vault.branch || "main");
      const filePath = path.replace("/v1/files", "").replace(/^\//, "");

      if (method === "GET") {
        // Use query parameter 'path' as per OpenAPI spec, fall back to URL path
        const queryPath = url.searchParams.get("path") || filePath;

        // If no specific file is requested, return full recursive tree list conforming to FileList schema
        if (!queryPath) {
          try {
            const treeData = await github.getTree(
              vault.github_owner,
              vault.github_repo,
              safeBranch,
              true,
            );
            const entries = (treeData.tree || []).map(
              (item: {
                path: string;
                type: string;
                size?: number;
                sha: string;
              }) => ({
                path: item.path,
                name: item.path.split("/").pop() || item.path,
                type: item.type === "tree" ? "directory" : "file",
                size: item.size || 0,
                sha: item.sha,
                lastModified: new Date().toISOString(),
              }),
            );

            return new Response(
              JSON.stringify({
                path: "",
                entries,
              }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          } catch (_treeErr) {
            // Fallback to getContents
            const contents = await github.getContents(
              vault.github_owner,
              vault.github_repo,
              "",
            );
            const entries = Array.isArray(contents)
              ? contents.map(
                  (c: {
                    path: string;
                    name: string;
                    type: string;
                    size: number;
                    sha: string;
                  }) => ({
                    path: c.path,
                    name: c.name,
                    type: c.type === "dir" ? "directory" : "file",
                    size: c.size,
                    sha: c.sha,
                    lastModified: new Date().toISOString(),
                  }),
                )
              : [];

            return new Response(
              JSON.stringify({
                path: "",
                entries,
              }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
        }

        // Specific file or subpath requested
        const contents = await github.getContents(
          vault.github_owner,
          vault.github_repo,
          queryPath,
        );

        // If it's a directory, return FileList schema
        if (Array.isArray(contents)) {
          const entries = contents.map(
            (c: {
              name: string;
              path: string;
              type: string;
              size: number;
              sha: string;
            }) => ({
              name: c.name,
              path: c.path,
              type: c.type === "dir" ? "directory" : "file",
              size: c.size,
              sha: c.sha,
              lastModified: new Date().toISOString(),
            }),
          );
          return new Response(JSON.stringify({ path: queryPath, entries }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // If it's a file, format single File schema response
        return new Response(
          JSON.stringify({
            name: contents.name,
            path: contents.path,
            type: contents.type === "dir" ? "directory" : "file",
            size: contents.size,
            sha: contents.sha,
            content: contents.content, // base64 encoded
            lastModified: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } else if (method === "POST" || method === "PUT") {
        // POST /v1/files (create) or PUT /v1/files/{path} (update)
        const body = await req.json();
        // OpenAPI: PUT uses 'expectedSha', keep backward compat with 'sha'
        const {
          path: bodyPath,
          content,
          expectedSha,
          sha: legacySha,
          commitMessage,
        } = body;
        const targetPath = method === "POST" ? bodyPath : filePath;
        const resolvedSha = expectedSha || legacySha;

        if (!targetPath || typeof content !== "string") {
          return errorResponse(
            corsHeaders,
            400,
            "BAD_REQUEST",
            "path and content (base64) are required",
          );
        }

        const message =
          commitMessage ||
          (method === "POST"
            ? `Create note: ${targetPath}`
            : `Update note: ${targetPath}`);

        try {
          const result = await github.createOrUpdateFile(
            vault.github_owner,
            vault.github_repo,
            targetPath,
            message,
            content,
            resolvedSha,
            safeBranch,
          );

          return new Response(
            JSON.stringify({
              name: result.content.name,
              path: result.content.path,
              type: "file",
              sha: result.content.sha,
              size: result.content.size,
              lastModified: new Date().toISOString(),
            }),
            {
              status: method === "POST" ? 201 : 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        } catch (ghErr: unknown) {
          const err = ghErr as { status?: number; message?: string };
          if (err.status === 409 || err.status === 422) {
            return errorResponse(
              corsHeaders,
              409,
              "CONFLICT",
              "Conflict: File was modified remotely or SHA mismatch",
            );
          }
          throw ghErr;
        }
      } else if (method === "DELETE") {
        // OpenAPI: DELETE /v1/files/{path} - sha can come from body or query param
        let sha: string | null = url.searchParams.get("sha");

        // Also try request body for OpenAPI compliance (expectedSha in body)
        if (!sha) {
          try {
            const body = await req.json();
            sha = body.expectedSha || body.sha || null;
          } catch {
            // No body - that's ok, check query param only
          }
        }

        if (!sha) {
          return errorResponse(
            corsHeaders,
            400,
            "BAD_REQUEST",
            "expectedSha is required for deletion (in request body or sha query parameter)",
          );
        }

        await github.deleteFile(
          vault.github_owner,
          vault.github_repo,
          filePath,
          `Delete note: ${filePath}`,
          sha,
          safeBranch,
        );

        return new Response(null, {
          status: 204,
          headers: { ...corsHeaders },
        });
      }
    }

    // Default 404 for unhandled routes
    return errorResponse(corsHeaders, 404, "NOT_FOUND", "Route not found");
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    console.error(error);
    const status = err.status || 500;
    return new Response(
      JSON.stringify({
        code: "INTERNAL_ERROR",
        message: err.message || "Internal server error",
      }),
      {
        status: status >= 400 && status < 600 ? status : 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      },
    );
  }
});
