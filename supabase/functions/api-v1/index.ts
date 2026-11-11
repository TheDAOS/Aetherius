import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";
import { GitHubClient } from "../_shared/github.ts";
import { createHandler } from "./handler.ts";

const url = Deno.env.get("SUPABASE_URL") ?? "";
Deno.serve(
  createHandler({
    userClient: (authorization) =>
      createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
        global: { headers: { Authorization: authorization } },
      }),
    tokenClient: () =>
      createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    github: (token) => new GitHubClient(token),
    allowedOrigins: (
      Deno.env.get("ALLOWED_ORIGINS") ||
      "https://aetherius.sanju.fyi,http://localhost:5173"
    )
      .split(",")
      .map((value) => value.trim()),
  }),
);
