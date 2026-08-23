import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders with default props", () => {
    const { getByText } = render(<Badge>Hello</Badge>);
    const badge = getByText("Hello");
    expect(badge).toBeInTheDocument();
    // Default size is sm, variant is acid
    expect(badge.className).toContain("text-[10px]");
    expect(badge.className).toContain("bg-accent-acid");
  });

  it("renders with different sizes", () => {
    const { getByText, rerender } = render(<Badge size="md">Hello</Badge>);
    const badge = getByText("Hello");
    expect(badge.className).toContain("text-xs");

    rerender(<Badge size="sm">Hello</Badge>);
    expect(getByText("Hello").className).toContain("text-[10px]");
  });

  it("renders with all variants", () => {
    const variants = ["acid", "orange", "pink", "cobalt", "mint", "muted"] as const;
    const { getByText, rerender } = render(<Badge variant="acid">Hello</Badge>);
    
    for (const variant of variants) {
      rerender(<Badge variant={variant}>Hello</Badge>);
      const badge = getByText("Hello");
      // Just testing it doesn't crash and changes class, vitest runs it
      expect(badge).toBeInTheDocument();
    }
  });

  it("applies custom className", () => {
    const { getByText } = render(<Badge className="custom-class">Hello</Badge>);
    expect(getByText("Hello").className).toContain("custom-class");
  });
});
