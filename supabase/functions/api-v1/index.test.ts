import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { assertSpyCalls, stub, returnsNext } from "https://deno.land/std@0.208.0/testing/mock.ts";

let handler: (req: Request) => Promise<Response>;

// Stub Deno.serve before importing the module
const serveStub = stub(
  Deno,
  "serve",
  (arg1: any, arg2?: any) => {
    handler = typeof arg1 === "function" ? arg1 : arg2;
    return {} as any;
  }
);

Deno.env.set("SUPABASE_URL", "https://mock.supabase.co");
Deno.env.set("SUPABASE_ANON_KEY", "mock-anon-key");
Deno.env.set("ALLOWED_ORIGINS", "https://aetherius.sanju.fyi");

import "./index.ts";

Deno.test("CORS Preflight (OPTIONS) returns 200 OK", async () => {
  const req = new Request("https://mock.supabase.co/api-v1/vaults", {
    method: "OPTIONS",
    headers: { Origin: "https://aetherius.sanju.fyi" },
  });

  const res = await handler(req);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "https://aetherius.sanju.fyi");
});

Deno.test("Missing Authorization returns 401 UNAUTHORIZED", async () => {
  const req = new Request("https://mock.supabase.co/api-v1/vaults", {
    method: "GET",
    headers: { Origin: "https://aetherius.sanju.fyi" },
  });

  const res = await handler(req);
  assertEquals(res.status, 401);
  const data = await res.json();
  assertEquals(data.code, "UNAUTHORIZED");
  assertEquals(data.message, "Missing Authorization header");
});

// Assuming invalid token fails auth
Deno.test("Invalid Authorization returns 401 UNAUTHORIZED", async () => {
  const req = new Request("https://mock.supabase.co/api-v1/vaults", {
    method: "GET",
    headers: { 
      Origin: "https://aetherius.sanju.fyi",
      Authorization: "Bearer invalid-token"
    },
  });

  const res = await handler(req);
  // It should try to verify with Supabase, which will fail since we mock supabase but it attempts network call
  // We should ideally mock createClient from supabase-js, but that's complex here without import maps.
  // Assuming it returns 401
  assertEquals(res.status, 401);
  const data = await res.json();
  assertEquals(data.code, "UNAUTHORIZED");
});

serveStub.restore();
