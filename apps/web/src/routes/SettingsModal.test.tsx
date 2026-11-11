import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { SettingsModal } from "./SettingsModal";

const mocks = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("../hooks/usePWA", () => ({
  usePWA: () => ({ isInstallable: false, isOnline: true }),
}));
vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ signOut: mocks.signOut }),
}));
const props = {
  isOpen: true,
  onClose: vi.fn(),
  vault: { id: "v", owner: "u", repository: "r", branch: "main" },
  syncStatus: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.signOut.mockResolvedValue(undefined);
  vi.stubGlobal(
    "confirm",
    vi.fn(() => false),
  );
});
it("removes the fake reset action and explains offline retention", () => {
  render(<SettingsModal {...props} />);
  expect(screen.queryByText("Reset to Defaults")).not.toBeInTheDocument();
  expect(
    screen.getByText(/Signing out does not erase them/),
  ).toBeInTheDocument();
});
it("keeps dialog open on failed signout and displays error", async () => {
  mocks.signOut.mockRejectedValue(new Error("Network unavailable"));
  render(<SettingsModal {...props} />);
  fireEvent.click(screen.getByText("Sign Out"));
  await screen.findByRole("alert");
  expect(props.onClose).not.toHaveBeenCalled();
});
it("guards unsaved editor content before signout", () => {
  render(<SettingsModal {...props} isDirty />);
  fireEvent.click(screen.getByText("Sign Out"));
  expect(window.confirm).toHaveBeenCalled();
  expect(mocks.signOut).not.toHaveBeenCalled();
});
it("closes only after signout succeeds", async () => {
  render(<SettingsModal {...props} />);
  fireEvent.click(screen.getByText("Sign Out"));
  await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
});
