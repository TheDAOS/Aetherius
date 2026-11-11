import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GraphCanvas } from "./GraphCanvas";

const graphIndex = {
  nodes: [
    { id: "a.md", path: "a.md", title: "A", tags: [], degree: 0, isHub: false },
  ],
  edges: [],
  backlinks: new Map(),
  unlinkedMentions: new Map(),
  tagMap: new Map(),
};
beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
afterEach(() => vi.restoreAllMocks());

describe("GraphCanvas gestures", () => {
  it("distinguishes dragging a node from opening it", () => {
    const select = vi.fn();
    render(<GraphCanvas graphIndex={graphIndex} onSelectNode={select} />);
    const canvas = screen.getByRole("application");
    // The node initializes at (400,300), with the viewport translated by (400,300).
    fireEvent.mouseDown(canvas, { clientX: 800, clientY: 600 });
    fireEvent.mouseMove(canvas, { clientX: 850, clientY: 650 });
    fireEvent.mouseUp(canvas, { clientX: 850, clientY: 650 });
    expect(select).not.toHaveBeenCalled();
    fireEvent.mouseDown(canvas, { clientX: 850, clientY: 650 });
    fireEvent.mouseUp(canvas, { clientX: 850, clientY: 650 });
    expect(select).toHaveBeenCalledWith("a.md");
  });
});
