import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("does not render when isOpen is false", () => {
    const { queryByRole } = render(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        Content
      </Modal>
    );
    expect(queryByRole("dialog")).toBeNull();
  });

  it("renders when isOpen is true", () => {
    const { getByRole, getByText } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        Content
      </Modal>
    );
    expect(getByRole("dialog")).toBeInTheDocument();
    expect(getByText("Test Modal")).toBeInTheDocument();
    expect(getByText("Content")).toBeInTheDocument();
  });

  it("renders badgeText when provided", () => {
    const { getByText } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal" badgeText="New">
        Content
      </Modal>
    );
    expect(getByText("New")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    const { getByTitle } = render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        Content
      </Modal>
    );
    fireEvent.click(getByTitle("Close (Esc)"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when background overlay is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        Content
      </Modal>
    );
    // Background overlay is the first div inside the outer div, just before the dialog
    const overlay = container.querySelector('div[aria-hidden="true"]');
    if (overlay) {
      fireEvent.click(overlay);
    }
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape key press", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        Content
      </Modal>
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose on other key press", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        Content
      </Modal>
    );
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("handles focus trap with Tab", () => {
    const { getByRole, getByTestId, container } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <input data-testid="input1" />
        <input data-testid="input2" />
      </Modal>
    );

    const dialog = getByRole("dialog");
    const closeBtn = container.querySelector('button[title="Close (Esc)"]') as HTMLElement;
    const input1 = getByTestId("input1") as HTMLElement;
    const input2 = getByTestId("input2") as HTMLElement;

    // Focus order initially sets to first focusable, which is closeBtn
    expect(document.activeElement).toBe(closeBtn);

    // If active is closeBtn and Shift+Tab is pressed, focus should wrap to last focusable (input2)
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(input2);

    // If active is input2 and Tab is pressed, focus should wrap to first focusable (closeBtn)
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: false });
    expect(document.activeElement).toBe(closeBtn);

    // If active is input1 and Shift+Tab is pressed, focus shouldn't be wrapped by our handler
    input1.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(input1); // handler does nothing

    // If active is input1 and Tab is pressed, focus shouldn't be wrapped by our handler
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: false });
    expect(document.activeElement).toBe(input1); // handler does nothing
  });

  it("ignores non-Tab keys in focus trap", () => {
    const { getByRole, container } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <input />
      </Modal>
    );
    
    const dialog = getByRole("dialog");
    const closeBtn = container.querySelector('button[title="Close (Esc)"]') as HTMLElement;
    
    expect(document.activeElement).toBe(closeBtn);
    fireEvent.keyDown(dialog, { key: "Enter" });
    expect(document.activeElement).toBe(closeBtn); // Still same
  });
});
