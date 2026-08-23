import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("renders with default props", () => {
    const { getByText } = render(<Button>Click me</Button>);
    const button = getByText("Click me");
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("bg-accent-orange"); // primary variant default
    expect(button.className).toContain("px-4 py-2"); // md size default
  });

  it("renders with different sizes", () => {
    const sizes = ["sm", "md", "lg"] as const;
    const { getByText, rerender } = render(<Button size="sm">Btn</Button>);
    
    for (const size of sizes) {
      rerender(<Button size={size}>Btn</Button>);
      expect(getByText("Btn")).toBeInTheDocument();
    }
  });

  it("renders with different variants", () => {
    const variants = ["primary", "secondary", "acid", "danger", "ghost"] as const;
    const { getByText, rerender } = render(<Button variant="primary">Btn</Button>);
    
    for (const variant of variants) {
      rerender(<Button variant={variant}>Btn</Button>);
      expect(getByText("Btn")).toBeInTheDocument();
    }
  });

  it("renders icon", () => {
    const { getByText } = render(<Button icon={<span>Icon</span>}>Btn</Button>);
    expect(getByText("Icon")).toBeInTheDocument();
  });

  it("disables the button", () => {
    const { getByRole } = render(<Button disabled>Btn</Button>);
    const button = getByRole("button");
    expect(button).toBeDisabled();
    expect(button.className).toContain("disabled:opacity-50");
  });
  
  it("applies custom className", () => {
    const { getByRole } = render(<Button className="custom-class">Btn</Button>);
    expect(getByRole("button").className).toContain("custom-class");
  });
});
