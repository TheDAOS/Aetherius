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

      return new Response(JSON.stringify(vault), {
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
      const repoResult = await github.createRepository(repository, description, true);

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

      return new Response(JSON.stringify(newVault), {
        status: 201,
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
        // GET /v1/files or GET /v1/files/{path}
        const contents = await github.getContents(vault.github_owner, vault.github_repo, filePath);
        
        // If it's a directory (or root), GitHub returns an array
        if (Array.isArray(contents)) {
          const files = contents.map((c: any) => ({
            name: c.name,
            path: c.path,
            type: c.type,
            size: c.size,
            sha: c.sha,
          }));
          return new Response(JSON.stringify({ files }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // If it's a file, format the response
        return new Response(JSON.stringify({
          name: contents.name,
          path: contents.path,
          type: contents.type,
          size: contents.size,
          sha: contents.sha,
          content: contents.content, // base64 encoded
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } else if (method === 'POST' || method === 'PUT') {
        // POST /v1/files (create) or PUT /v1/files/{path} (update)
        const body = await req.json();
        const { path: bodyPath, content, sha } = body;
        const targetPath = method === 'POST' ? bodyPath : filePath;
        
        if (!targetPath || typeof content !== 'string') {
          return new Response(JSON.stringify({ error: 'path and content (base64) are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const message = method === 'POST' ? `Create note: ${targetPath}` : `Update note: ${targetPath}`;
        
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
          sha: result.content.sha,
        }), {
          status: method === 'POST' ? 201 : 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } else if (method === 'DELETE') {
        const urlParams = new URL(req.url).searchParams;
        const sha = urlParams.get('sha'); // Need sha to delete
        
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

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
