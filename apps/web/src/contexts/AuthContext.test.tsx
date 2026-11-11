import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { offlineDb } from "../services/storage/offlineDb";
import { AuthProvider, useAuth } from "./AuthContext";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  store: vi.fn(),
}));
vi.mock("../services/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signOut: mocks.signOut,
    },
  },
}));
vi.mock("../services/vault", () => ({
  vaultService: { storeGitHubToken: mocks.store },
}));
let auth: ReturnType<typeof useAuth>;
const Probe = () => {
  auth = useAuth();
  return (
    <span>
      {auth.loading
        ? "waiting"
        : (auth.error ?? (auth.session ? "ready" : "signed out"))}
    </span>
  );
};
const session = {
  access_token: "jwt",
  provider_token: "secret",
  user: { id: "u" },
};
beforeEach(async () => {
  vi.clearAllMocks();
  offlineDb.setUserId("u");
  await offlineDb.clearAll();
  mocks.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  mocks.getSession.mockResolvedValue({ data: { session }, error: null });
  mocks.store.mockResolvedValue(undefined);
  mocks.signOut.mockResolvedValue({ error: null });
});
it("waits for token setup and removes provider tokens from exposed auth state", async () => {
  let finish!: () => void;
  mocks.store.mockReturnValue(
    new Promise<void>((r) => {
      finish = r;
    }),
  );
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(mocks.store).toHaveBeenCalledWith("secret"));
  expect(screen.getByText("waiting")).toBeInTheDocument();
  await act(async () => finish());
  await screen.findByText("ready");
  expect(auth.session?.provider_token).toBeUndefined();
});
it("surfaces token setup errors and prevents workspace readiness", async () => {
  mocks.store.mockRejectedValue(new Error("Cannot secure token"));
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await screen.findByText("Cannot secure token");
  expect(auth.session).toBeNull();
});
it("preserves pending changes when signout fails or succeeds", async () => {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await screen.findByText("ready");
  await offlineDb.applyMutation(
    { action: "create", path: "new.md", content: "only local copy" },
    {
      path: "new.md",
      name: "new.md",
      type: "file",
      content: "only local copy",
    },
  );
  mocks.signOut.mockResolvedValueOnce({
    error: new Error("network unavailable"),
  });
  await act(async () => {
    await auth.signOut().catch(() => {});
  });
  expect(await offlineDb.getPendingMutations()).toHaveLength(1);
  await act(async () => auth.signOut());
  offlineDb.setUserId("u");
  expect(await offlineDb.getPendingMutations()).toHaveLength(1);
});

it("preserves the mounted workspace and editor draft during same-user token refresh", async () => {
  let listener!: (event: string, value: unknown) => void;
  mocks.onAuthStateChange.mockImplementation((callback) => {
    listener = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
  const Editor = () => <input aria-label="Draft" defaultValue="" />;
  const Boundary = () => {
    const state = useAuth();
    return state.loading ? (
      <span>waiting</span>
    ) : state.session ? (
      <Editor />
    ) : null;
  };
  render(
    <AuthProvider>
      <Boundary />
      <Probe />
    </AuthProvider>,
  );
  const editor = await screen.findByRole("textbox", { name: "Draft" });
  (editor as HTMLInputElement).value = "unsaved draft";
  let completeTransfer!: () => void;
  mocks.store.mockReturnValue(
    new Promise<void>((resolve) => {
      completeTransfer = resolve;
    }),
  );
  await act(async () => {
    listener("SIGNED_IN", { ...session, access_token: "refreshed-jwt" });
  });
  await waitFor(() => expect(mocks.store).toHaveBeenCalledTimes(2));
  expect(screen.getByRole("textbox", { name: "Draft" })).toBe(editor);
  await act(async () => completeTransfer());
  await waitFor(() => expect(auth.session?.access_token).toBe("refreshed-jwt"));
  expect(screen.getByRole("textbox", { name: "Draft" })).toBe(editor);
  expect(editor).toHaveValue("unsaved draft");
});
