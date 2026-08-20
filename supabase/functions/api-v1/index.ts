import "@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    
    // In a real environment, we'd use the Supabase client to verify the JWT 
    // and retrieve the user, but for now we just parse the route.

    const url = new URL(req.url);
    const path = url.pathname.replace('/api-v1', ''); // Strip function mount path
    const method = req.method;

    console.log(`[api-v1] ${method} ${path}`);

    // 2. Basic Router (returning 501 Not Implemented to satisfy OpenAPI contract scaffold)
    let responseBody = { error: 'Not Implemented' };
    let status = 501;

    if (method === 'GET' && path === '/v1/vault') {
      responseBody = { message: 'getVault endpoint scaffolded' };
    } else if (method === 'GET' && path === '/v1/files') {
      responseBody = { message: 'listFiles endpoint scaffolded' };
    } else if (method === 'POST' && path === '/v1/files') {
      responseBody = { message: 'createFile endpoint scaffolded' };
    } else if (method === 'GET' && path.startsWith('/v1/files/')) {
      responseBody = { message: 'getFile endpoint scaffolded' };
    } else if (method === 'PUT' && path.startsWith('/v1/files/')) {
      responseBody = { message: 'updateFile endpoint scaffolded' };
    } else if (method === 'DELETE' && path.startsWith('/v1/files/')) {
      responseBody = { message: 'deleteFile endpoint scaffolded' };
    } else if (method === 'GET' && path === '/v1/search') {
      responseBody = { message: 'searchVault endpoint scaffolded' };
    } else if (method === 'POST' && path === '/v1/sync') {
      responseBody = { message: 'syncVault endpoint scaffolded' };
    } else if (method === 'GET' && path === '/v1/sync/status') {
      responseBody = { message: 'getSyncStatus endpoint scaffolded' };
    } else {
      status = 404;
      responseBody = { error: 'Route not found in api-v1' };
    }

    return new Response(JSON.stringify(responseBody), {
      status,
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
