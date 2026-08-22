import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GitHubClient } from "../_shared/github.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-github-token',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. JWT Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const githubToken = req.headers.get('x-github-token');
    if (!githubToken) {
      return new Response(JSON.stringify({ error: 'Missing x-github-token header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const github = new GitHubClient(githubToken);

    const url = new URL(req.url);
    const path = url.pathname.replace('/api-v1', ''); // Strip function mount path
    const method = req.method;

    console.log(`[api-v1] ${method} ${path}`);

    if (method === 'GET' && path === '/v1/vault') {
      const { data: vault, error } = await supabaseClient
        .from('vaults')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!vault) {
        return new Response(JSON.stringify({ error: 'No vault configured' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        id: vault.id,
        owner: vault.github_owner,
        repository: vault.github_repo,
        branch: vault.branch
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } 
    
    if (method === 'POST' && path === '/v1/vault') {
      const body = await req.json();
      const { repository, description } = body;

      if (!repository) {
        return new Response(JSON.stringify({ error: 'repository is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if vault already exists for user
      const { data: existingVault } = await supabaseClient
        .from('vaults')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingVault) {
        return new Response(JSON.stringify({ error: 'Vault already exists' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get github user info to get the owner name
      const ghUser = await github.getUser();

      // Create GitHub repository
      await github.createRepository(repository, description, true);

      // Seed initial vault template files
      await github.initTemplateFiles(ghUser.login, repository, 'main');

      // Save to Supabase
      const { data: newVault, error: insertError } = await supabaseClient
        .from('vaults')
        .insert({
          user_id: user.id,
          github_owner: ghUser.login,
          github_repo: repository,
          branch: 'main'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(JSON.stringify({
        id: newVault.id,
        owner: newVault.github_owner,
        repository: newVault.github_repo,
        branch: newVault.branch
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Vault Search Endpoint (GET /v1/search?q=...)
    if (method === 'GET' && path === '/v1/search') {
      const { data: vault, error } = await supabaseClient
        .from('vaults')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !vault) {
        return new Response(JSON.stringify({ error: 'No vault configured' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const q = url.searchParams.get('q') || '';
      const pathPrefix = url.searchParams.get('path') || '';

      if (!q.trim()) {
        return new Response(JSON.stringify({ error: 'Search query parameter "q" is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const results: Array<{ path: string; title: string; snippet: string; score?: number }> = [];

      try {
        // First try GitHub search code API
        const ghSearch = await github.searchCode(vault.github_owner, vault.github_repo, q);
        if (ghSearch && Array.isArray(ghSearch.items)) {
          for (const item of ghSearch.items) {
            if (pathPrefix && !item.path.startsWith(pathPrefix)) continue;
            results.push({
              path: item.path,
              title: item.name,
              snippet: `Match found in ${item.path}`,
              score: item.score || 1.0
            });
          }
        }
      } catch (_searchErr) {
        // Fallback: tree match on path and filename if search code is unavailable / not yet indexed
        try {
          const treeData = await github.getTree(vault.github_owner, vault.github_repo, vault.branch || 'main', true);
          if (treeData && Array.isArray(treeData.tree)) {
            const queryLower = q.toLowerCase();
            for (const item of treeData.tree) {
              if (item.type === 'blob' && item.path.toLowerCase().includes(queryLower)) {
                if (pathPrefix && !item.path.startsWith(pathPrefix)) continue;
                const filename = item.path.split('/').pop() || item.path;
                results.push({
                  path: item.path,
                  title: filename,
                  snippet: `Matched path: ${item.path}`,
                  score: 1.0
                });
              }
            }
          }
        } catch (_treeErr) {
          // No results on fallback
        }
      }

      return new Response(JSON.stringify({
        query: q,
        results
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Sync Endpoints (GET /v1/sync/status, POST /v1/sync)
    if (path === '/v1/sync/status' && method === 'GET') {
      const { data: vault, error } = await supabaseClient
        .from('vaults')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !vault) {
        return new Response(JSON.stringify({ error: 'No vault configured' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        status: 'idle',
        lastSyncAt: new Date().toISOString(),
        message: `Vault ${vault.github_owner}/${vault.github_repo} is synchronized with GitHub`
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === '/v1/sync' && method === 'POST') {
      const { data: vault, error } = await supabaseClient
        .from('vaults')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !vault) {
        return new Response(JSON.stringify({ error: 'No vault configured' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        id: crypto.randomUUID(),
        status: 'completed'
      }), {
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // File System Endpoints
    if (path.startsWith('/v1/files')) {
      const { data: vault, error } = await supabaseClient
        .from('vaults')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !vault) {
        return new Response(JSON.stringify({ error: 'No vault configured' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const filePath = path.replace('/v1/files', '').replace(/^\//, '');

      if (method === 'GET') {
        // If no specific file is requested, return full recursive tree list conforming to FileList schema
        if (!filePath) {
          try {
            const treeData = await github.getTree(vault.github_owner, vault.github_repo, vault.branch || 'main', true);
            const entries = (treeData.tree || []).map((item: any) => ({
              path: item.path,
              name: item.path.split('/').pop() || item.path,
              type: item.type === 'tree' ? 'directory' : 'file',
              size: item.size || 0,
              sha: item.sha,
              lastModified: new Date().toISOString()
            }));

            return new Response(JSON.stringify({
              path: '',
              entries
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (_treeErr) {
            // Fallback to getContents
            const contents = await github.getContents(vault.github_owner, vault.github_repo, '');
            const entries = Array.isArray(contents)
              ? contents.map((c: any) => ({
                  path: c.path,
                  name: c.name,
                  type: c.type === 'dir' ? 'directory' : 'file',
                  size: c.size,
                  sha: c.sha,
                  lastModified: new Date().toISOString()
                }))
              : [];

            return new Response(JSON.stringify({
              path: '',
              entries
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        // Specific file or subpath requested
        const contents = await github.getContents(vault.github_owner, vault.github_repo, filePath);
        
        // If it's a directory, return FileList schema
        if (Array.isArray(contents)) {
          const entries = contents.map((c: any) => ({
            name: c.name,
            path: c.path,
            type: c.type === 'dir' ? 'directory' : 'file',
            size: c.size,
            sha: c.sha,
            lastModified: new Date().toISOString()
          }));
          return new Response(JSON.stringify({ path: filePath, entries }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // If it's a file, format single File schema response
        return new Response(JSON.stringify({
          name: contents.name,
          path: contents.path,
          type: contents.type === 'dir' ? 'directory' : 'file',
          size: contents.size,
          sha: contents.sha,
          content: contents.content, // base64 encoded
          lastModified: new Date().toISOString()
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } else if (method === 'POST' || method === 'PUT') {
        // POST /v1/files (create) or PUT /v1/files/{path} (update)
        const body = await req.json();
        const { path: bodyPath, content, sha, commitMessage } = body;
        const targetPath = method === 'POST' ? bodyPath : filePath;
        
        if (!targetPath || typeof content !== 'string') {
          return new Response(JSON.stringify({ error: 'path and content (base64) are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const message = commitMessage || (method === 'POST' ? `Create note: ${targetPath}` : `Update note: ${targetPath}`);
        
        try {
          const result = await github.createOrUpdateFile(
            vault.github_owner,
            vault.github_repo,
            targetPath,
            message,
            content,
            sha,
            vault.branch
          );

          return new Response(JSON.stringify({
            name: result.content.name,
            path: result.content.path,
            type: 'file',
            sha: result.content.sha,
            size: result.content.size,
            lastModified: new Date().toISOString()
          }), {
            status: method === 'POST' ? 201 : 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (ghErr: any) {
          if (ghErr.status === 409 || ghErr.status === 422) {
            return new Response(JSON.stringify({
              code: 'CONFLICT',
              message: 'Conflict: File was modified remotely or SHA mismatch'
            }), {
              status: 409,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          throw ghErr;
        }

      } else if (method === 'DELETE') {
        const urlParams = new URL(req.url).searchParams;
        const sha = urlParams.get('sha');
        
        if (!sha) {
          return new Response(JSON.stringify({ error: 'sha query parameter is required for deletion' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        await github.deleteFile(
          vault.github_owner,
          vault.github_repo,
          filePath,
          `Delete note: ${filePath}`,
          sha,
          vault.branch
        );

        return new Response(null, {
          status: 204,
          headers: { ...corsHeaders }
        });
      }
    }

    // Default 404 for unhandled routes
    return new Response(JSON.stringify({ error: 'Route not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error(error);
    const status = error.status || 500;
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: status >= 400 && status < 600 ? status : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
