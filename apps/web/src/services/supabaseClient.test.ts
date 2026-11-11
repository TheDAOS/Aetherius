import { beforeEach, expect, it, vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({}),
}));

import { sessionStorage } from "./supabaseClient";

beforeEach(() => localStorage.clear());
it("migrates legacy provider credentials without losing the one-time OAuth handoff", () => {
  localStorage.setItem(
    "session",
    JSON.stringify({
      access_token: "jwt",
      provider_token: "github-token",
      provider_refresh_token: "github-refresh",
    }),
  );
  expect(JSON.parse(sessionStorage.getItem("session")!)).toMatchObject({
    provider_token: "github-token",
  });
  expect(JSON.parse(localStorage.getItem("session")!)).toEqual({
    access_token: "jwt",
  });
  expect(JSON.parse(sessionStorage.getItem("session")!)).toEqual({
    access_token: "jwt",
  });
});
it("never persists new provider tokens or changes PKCE strings", () => {
  sessionStorage.setItem(
    "session",
    JSON.stringify({ access_token: "jwt", provider_token: "secret" }),
  );
  expect(JSON.parse(localStorage.getItem("session")!)).toEqual({
    access_token: "jwt",
  });
  sessionStorage.setItem("pkce", JSON.stringify("verifier"));
  expect(sessionStorage.getItem("pkce")).toBe(JSON.stringify("verifier"));
});
