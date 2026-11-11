import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { vaultService } from "../services/vault";
import { SearchModal } from "./SearchModal";

vi.mock("../services/vault", () => ({
  vaultService: { search: vi.fn(), listFiles: vi.fn() },
}));

describe("SearchModal", () => {
  it("shows request errors rather than reporting no matching notes", async () => {
    vi.mocked(vaultService.listFiles).mockRejectedValue(
      new Error("Vault unavailable"),
    );
    render(<SearchModal isOpen onClose={vi.fn()} onSelectFile={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Vault unavailable",
    );
    expect(
      screen.queryByText("No notes match your query."),
    ).not.toBeInTheDocument();
  });

  it("clears failed results when a new query succeeds", async () => {
    vi.mocked(vaultService.listFiles).mockRejectedValue(
      new Error("Vault unavailable"),
    );
    vi.mocked(vaultService.search).mockResolvedValue({
      query: "alpha",
      results: [
        { path: "alpha.md", title: "Alpha", snippet: "Found note", score: 1 },
      ],
    });
    const select = vi.fn();
    render(<SearchModal isOpen onClose={vi.fn()} onSelectFile={select} />);
    await screen.findByRole("alert");
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "alpha" },
    });
    fireEvent.click(await screen.findByText("alpha.md"));
    expect(select).toHaveBeenCalledWith("alpha.md");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
