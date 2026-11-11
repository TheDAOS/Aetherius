import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotePreview } from "./NotePreview";

describe("NotePreview", () => {
  it("renders safe clickable wikilinks and leaves code and raw HTML inert", () => {
    const onSelectFile = vi.fn();
    const { container } = render(
      <NotePreview
        content={
          "[[other|Read <other>]]\n\n`[[code]]`\n\n<img src=x onerror=alert(1)>"
        }
        onSelectFile={onSelectFile}
      />,
    );
    fireEvent.click(screen.getByRole("link", { name: "Read <other>" }));
    expect(onSelectFile).toHaveBeenCalledWith("other");
    expect(container.querySelectorAll(".wikilink")).toHaveLength(1);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("code")).toHaveTextContent("[[code]]");
  });

  it("opens relative Markdown links inside the vault and external links safely", () => {
    const onSelectFile = vi.fn();
    render(
      <NotePreview
        content={"[Sibling](../other.md) [Web](https://example.com)"}
        activeFilePath="notes/folder/current.md"
        onSelectFile={onSelectFile}
      />,
    );
    fireEvent.click(screen.getByRole("link", { name: "Sibling" }));
    expect(onSelectFile).toHaveBeenCalledWith("notes/other.md");
    expect(screen.getByRole("link", { name: "Sibling" })).not.toHaveAttribute(
      "target",
    );
    expect(screen.getByRole("link", { name: "Web" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
  });

  it("loads private vault images through the authenticated asset resolver", async () => {
    const resolveAsset = vi
      .fn()
      .mockResolvedValue("blob:https://aetherius.test/image");
    render(
      <NotePreview
        content="![Picture](../assets/photo.png)"
        activeFilePath="notes/a.md"
        resolveAsset={resolveAsset}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("img", { name: "Picture" })).toHaveAttribute(
        "src",
        "blob:https://aetherius.test/image",
      ),
    );
    expect(resolveAsset).toHaveBeenCalledWith("assets/photo.png");
  });

  it("does not request private asset paths from the public app origin", () => {
    render(<NotePreview content="![Picture](assets/photo.png)" />);
    expect(screen.getByRole("img", { name: "Picture" })).not.toHaveAttribute(
      "src",
    );
  });
});
