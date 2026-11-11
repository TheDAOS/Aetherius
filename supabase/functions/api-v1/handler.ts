import type { GitHubClient } from "../_shared/github.ts";

// --- CORS Configuration ---

function getCorsHeaders(
  req: Request,
  allowedOrigins: string[],
): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = allowedOrigins.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
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

// --- Repository Name Validation ---
function isValidRepoName(name: string): boolean {
  // GitHub repo names: alphanumeric, hyphens, underscores, periods
  // 1-100 characters, cannot start with period
  return /^[a-zA-Z0-9._-]{1,100}$/.test(name) && name !== "." && name !== "..";
}

export interface HandlerDependencies {
  // The user client must preserve the verified JWT and RLS for vault metadata.
  userClient: (authorization: string) => any;
  // This client exists only in the Edge runtime; never forward its key to clients.
  tokenClient: () => any;
  github: (token: string) => GitHubClient;
  allowedOrigins: string[];
}

function invalid(message: string): never {
  throw Object.assign(new Error(message), { status: 400, code: "BAD_REQUEST" });
}
async function readBody(req: Request): Promise<Record<string, any>> {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body))
      invalid("Expected a JSON object");
    return body;
  } catch {
    return invalid("Invalid JSON request body");
  }
}
function validatePath(path: unknown): asserts path is string {
  if (
    typeof path !== "string" ||
    !path ||
    path.startsWith("/") ||
    path.includes("\\") ||
    Array.from(path).some((char) => char.charCodeAt(0) < 32) ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  )
    invalid("Invalid repository-relative file path");
}
function validateBranch(branch: unknown): asserts branch is string {
  if (
    typeof branch !== "string" ||
    !branch ||
    branch.length > 255 ||
    branch.startsWith("-") ||
    branch.startsWith("/") ||
    branch.endsWith("/") ||
    branch.endsWith(".") ||
    branch.includes("..") ||
    branch.includes("@{") ||
    branch.includes("//") ||
    /[ ~^:?*[\]\\]/.test(branch) ||
    Array.from(branch).some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    ) ||
    branch
      .split("/")
      .some((part) => part.startsWith(".") || part.endsWith(".lock"))
  )
    invalid("Invalid Git branch name");
}
function checkBranch(expected: unknown, actual: string) {
  if (expected === undefined || expected === null) return;
  validateBranch(expected);
  if (expected !== actual)
    throw Object.assign(
      new Error(
        "The selected vault branch changed on another device. Reload the vault before applying these changes.",
      ),
      { status: 409, code: "BRANCH_CHANGED" },
    );
}
function publicVault(vault: {
  id: string;
  github_owner: string;
  github_repo: string;
  branch: string;
}) {
  return {
    id: vault.id,
    owner: vault.github_owner,
    repository: vault.github_repo,
    branch: vault.branch,
  };
}
function jsonResponse(
  data: unknown,
  cors: Record<string, string>,
  status = 200,
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
export function createHandler(deps: HandlerDependencies) {
  const run = async (req: Request) => {
    const corsHeaders = getCorsHeaders(req, deps.allowedOrigins);

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

      const supabaseClient = deps.userClient(authHeader);

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
      const path = url.pathname.replace(
        /^\/(?:functions\/v1\/)?api-v1(?=\/|$)/,
        "",
      ); // Strip function mount path
      const method = req.method;

      // Never log private note paths or provider credentials.

      // --- Token Storage Endpoint ---
      // Client stores GitHub token server-side once after OAuth (Rule #4 compliance)
      if (method === "POST" && path === "/v1/auth/github-token") {
        const body = await readBody(req);
        const { token } = body;

        if (!token || typeof token !== "string") {
          return errorResponse(
            corsHeaders,
            400,
            "BAD_REQUEST",
            "token is required",
          );
        }

        const identity = user.identities?.find(
          (item: { provider: string }) => item.provider === "github",
        );
        const githubUser = await deps.github(token).getUser();
        const providerId =
          identity?.provider_id ?? identity?.identity_data?.sub ?? identity?.id;
        if (!identity || String(githubUser.id) !== String(providerId)) {
          return errorResponse(
            corsHeaders,
            403,
            "FORBIDDEN",
            "GitHub token does not belong to this authenticated user",
          );
        }
        const { error: upsertError } = await deps
          .tokenClient()
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
      const { data: tokenRow, error: tokenError } = await deps
        .tokenClient()
        .from("user_github_tokens")
        .select("encrypted_token")
        .eq("user_id", user.id)
        .maybeSingle();

      if (tokenError) throw tokenError;

      const githubToken = tokenRow?.encrypted_token;
      if (!githubToken) {
        return errorResponse(
          corsHeaders,
          401,
          "TOKEN_REQUIRED",
          "GitHub token not found. Please re-authenticate to store your GitHub token.",
        );
      }

      const github = deps.github(githubToken);

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
        const body = await readBody(req);
        const {
          repository,
          description,
          mode = "create",
          owner,
          branch,
        } = body;
        if (mode !== "create" && mode !== "connect")
          invalid("mode must be create or connect");

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
            "Invalid repository name. Must be 1-100 characters using letters, digits, hyphens, underscores, or periods.",
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
        const { data: existingVault, error: existingError } =
          await supabaseClient
            .from("vaults")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (existingError) throw existingError;
        if (existingVault) {
          return errorResponse(
            corsHeaders,
            409,
            "CONFLICT",
            "Vault already exists",
          );
        }

        if (mode === "connect") {
          if (
            typeof owner !== "string" ||
            !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(owner)
          )
            invalid("A valid GitHub owner is required");
          const repositoryInfo = await github.getRepository(owner, repository);
          if (!repositoryInfo.private || !repositoryInfo.permissions?.push)
            return errorResponse(
              corsHeaders,
              403,
              "FORBIDDEN",
              "Connect requires a private repository with write access",
            );
          const selectedBranch = branch ?? repositoryInfo.default_branch;
          validateBranch(selectedBranch);
          await github.getTree(owner, repository, selectedBranch, true);
          const { data: connected, error: connectError } = await supabaseClient
            .from("vaults")
            .insert({
              user_id: user.id,
              github_owner: owner,
              github_repo: repository,
              branch: selectedBranch,
            })
            .select()
            .single();
          if (connectError) throw connectError;
          return jsonResponse(publicVault(connected), corsHeaders, 201);
        }
        // Get github user info to get the owner name
        const ghUser = await github.getUser();

        // Create GitHub repository
        const createdRepository = await github.createRepository(
          repository,
          typeof description === "string" ? description : "",
          true,
        );

        const defaultBranch = createdRepository.default_branch;
        try {
          if (!defaultBranch)
            throw new Error(
              "GitHub did not return the repository default branch",
            );
          // Seed initial vault template files
          await github.initTemplateFiles(
            ghUser.login,
            repository,
            defaultBranch,
          );

          // Save to Supabase
          const { data: newVault, error: insertError } = await supabaseClient
            .from("vaults")
            .insert({
              user_id: user.id,
              github_owner: ghUser.login,
              github_repo: repository,
              branch: defaultBranch,
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
            console.error("Vault setup rollback failed", {
              status: (rollbackErr as { status?: number }).status || 500,
            });
            return errorResponse(
              corsHeaders,
              502,
              "VAULT_SETUP_INCOMPLETE",
              `Vault setup failed after creating ${ghUser.login}/${repository}. The private repository may remain on GitHub because automatic cleanup could not complete. Connect this existing repository from setup to recover, or remove it in GitHub before retrying creation.`,
            );
          }
          throw err;
        }
      }

      if (method === "PATCH" && path === "/v1/vault") {
        const { branch } = await readBody(req);
        validateBranch(branch);
        const { data: vault, error } = await supabaseClient
          .from("vaults")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (!vault)
          return errorResponse(
            corsHeaders,
            404,
            "NOT_FOUND",
            "No vault configured",
          );
        await github.getTree(
          vault.github_owner,
          vault.github_repo,
          branch,
          true,
        );
        const { data: updated, error: updateError } = await supabaseClient
          .from("vaults")
          .update({ branch })
          .eq("user_id", user.id)
          .select()
          .single();
        if (updateError) throw updateError;
        return jsonResponse(publicVault(updated), corsHeaders);
      }
      if (method === "POST" && path === "/v1/files/move") {
        const { from, to, expectedSha, commitMessage, expectedBranch } =
          await readBody(req);
        validatePath(from);
        validatePath(to);
        if (from === to) invalid("Source and destination must differ");
        if (typeof expectedSha !== "string" || !expectedSha)
          invalid("expectedSha is required");
        if (
          commitMessage !== undefined &&
          (typeof commitMessage !== "string" ||
            !commitMessage ||
            commitMessage.length > 200)
        )
          invalid("commitMessage must be 1-200 characters");
        const { data: vault, error } = await supabaseClient
          .from("vaults")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (!vault)
          return errorResponse(
            corsHeaders,
            404,
            "NOT_FOUND",
            "No vault configured",
          );
        checkBranch(expectedBranch, vault.branch);
        const moved = await github.moveFile(
          vault.github_owner,
          vault.github_repo,
          vault.branch,
          from,
          to,
          expectedSha,
          commitMessage || `Move note: ${from} to ${to}`,
        );
        return jsonResponse(moved, corsHeaders);
      }

      // --- Search Endpoint ---
      if (method === "GET" && path === "/v1/search") {
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

        checkBranch(url.searchParams.get("expectedBranch"), vault.branch);
        const q = url.searchParams.get("q") || "";
        const pathPrefix = url.searchParams.get("path") || "";

        if (/(?:^|\s)(?:repo|org|user):/i.test(q))
          invalid(
            "Search is restricted to the configured vault; repository qualifiers are not supported",
          );
        if (!q.trim()) {
          return errorResponse(
            corsHeaders,
            400,
            "BAD_REQUEST",
            'Search query parameter "q" is required',
          );
        }

        const results: Array<{
          path: string;
          title: string;
          snippet: string;
          score?: number;
        }> = [];
        // First try GitHub search code API
        const repositoryInfo = await github.getRepository(
          vault.github_owner,
          vault.github_repo,
        );
        const ghSearch =
          vault.branch === repositoryInfo.default_branch
            ? await github.searchCode(vault.github_owner, vault.github_repo, q)
            : await github.searchBranch(
                vault.github_owner,
                vault.github_repo,
                vault.branch,
                q,
                pathPrefix,
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

        if (error) throw error;
        if (!vault) {
          return errorResponse(
            corsHeaders,
            404,
            "NOT_FOUND",
            "No vault configured",
          );
        }

        checkBranch(url.searchParams.get("expectedBranch"), vault.branch);
        await github.getTree(
          vault.github_owner,
          vault.github_repo,
          vault.branch,
          true,
        );
        return new Response(
          JSON.stringify({
            status: "idle",
            lastSyncAt: new Date().toISOString(),
            message: `Vault ${vault.github_owner}/${vault.github_repo} is reachable on GitHub; pending local changes are managed by the client`,
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

        if (error) throw error;
        if (!vault) {
          return errorResponse(
            corsHeaders,
            404,
            "NOT_FOUND",
            "No vault configured",
          );
        }

        const syncBody = req.body ? await readBody(req) : {};
        checkBranch(syncBody.expectedBranch, vault.branch);
        await github.getTree(
          vault.github_owner,
          vault.github_repo,
          vault.branch,
          true,
        );
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
      if (path === "/v1/files" || path.startsWith("/v1/files/")) {
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

        checkBranch(url.searchParams.get("expectedBranch"), vault.branch);
        const safeBranch = vault.branch;
        let filePath: string;
        try {
          filePath = decodeURIComponent(
            path.replace("/v1/files", "").replace(/^\//, ""),
          );
        } catch {
          invalid("Malformed URL path encoding");
        }

        if (method === "GET") {
          // Use query parameter 'path' as per OpenAPI spec, fall back to URL path
          const queryPath = url.searchParams.get("path") || filePath;

          // If no specific file is requested, return full recursive tree list conforming to FileList schema
          if (!queryPath) {
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
              }),
            );

            return new Response(
              JSON.stringify({
                path: "",
                entries,
              }),
              {
                status: 200,
                headers: {
                  ...corsHeaders,
                  "Content-Type": "application/json",
                },
              },
            );
          }

          // Specific file or subpath requested
          validatePath(queryPath);
          const contents = await github.getContents(
            vault.github_owner,
            vault.github_repo,
            queryPath,
            safeBranch,
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
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        } else if (method === "POST" || method === "PUT") {
          // POST /v1/files (create) or PUT /v1/files/{path} (update)
          const body = await readBody(req);
          // OpenAPI: PUT uses 'expectedSha', keep backward compat with 'sha'
          const {
            path: bodyPath,
            content,
            expectedSha,
            sha: legacySha,
            commitMessage,
          } = body;
          const targetPath = method === "POST" ? bodyPath : filePath;
          checkBranch(body.expectedBranch, vault.branch);
          const resolvedSha = expectedSha || legacySha;
          validatePath(targetPath);
          if (
            method === "PUT" &&
            (typeof resolvedSha !== "string" || !resolvedSha)
          )
            invalid("expectedSha is required for updates");
          if (typeof content === "string") {
            try {
              atob(content);
            } catch {
              invalid("content must be base64 encoded UTF-8");
            }
          }
          if (
            commitMessage !== undefined &&
            (typeof commitMessage !== "string" ||
              !commitMessage ||
              commitMessage.length > 200)
          )
            invalid("commitMessage must be 1-200 characters");

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
              }),
              {
                status: method === "POST" ? 201 : 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          } catch (ghErr: unknown) {
            const err = ghErr as { status?: number; message?: string };
            if (err.status === 409) {
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
          const deleteBody = req.body ? await readBody(req) : {};
          checkBranch(deleteBody.expectedBranch, vault.branch);
          const sha =
            url.searchParams.get("sha") ||
            deleteBody.expectedSha ||
            deleteBody.sha;

          if (typeof sha !== "string" || !sha) {
            return errorResponse(
              corsHeaders,
              400,
              "BAD_REQUEST",
              "expectedSha is required for deletion (in request body or sha query parameter)",
            );
          }

          validatePath(filePath);
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
      const err = error as { status?: number; message?: string; code?: string };
      console.error("API request failed", {
        status: (error as { status?: number }).status || 500,
      });
      const status = err.status || 500;
      return new Response(
        JSON.stringify({
          code:
            err.code ||
            (
              {
                401: "TOKEN_REQUIRED",
                403: "FORBIDDEN",
                404: "NOT_FOUND",
                409: "CONFLICT",
                422: "BAD_REQUEST",
                429: "RATE_LIMITED",
              } as Record<number, string>
            )[status] ||
            "INTERNAL_ERROR",
          message:
            status >= 500
              ? "Remote service unavailable; retry later"
              : err.message || "Request failed",
        }),
        {
          status: status >= 400 && status < 600 ? status : 500,
          headers: {
            ...getCorsHeaders(req, deps.allowedOrigins),
            "Content-Type": "application/json",
          },
        },
      );
    }
  };
  return async (req: Request): Promise<Response> => {
    const response = await run(req);
    if (response.status === 204 || req.method === "OPTIONS") return response;
    const body = await response.json();
    return new Response(
      JSON.stringify(
        response.ok ? { data: body, error: null } : { data: null, error: body },
      ),
      { status: response.status, headers: response.headers },
    );
  };
}
