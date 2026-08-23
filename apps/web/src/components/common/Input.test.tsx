import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Input } from "./Input";

describe("Input", () => {
  it("renders input correctly", () => {
    const { getByRole } = render(<Input placeholder="Type here" />);
    expect(getByRole("textbox")).toBeInTheDocument();
  });

  it("renders label when provided", () => {
    const { getByText } = render(<Input label="My Label" />);
    expect(getByText("My Label")).toBeInTheDocument();
  });

  it("renders error message and styles when provided", () => {
    const { getByText, getByRole } = render(<Input error="Invalid input" />);
    expect(getByText("Invalid input")).toBeInTheDocument();
    expect(getByRole("textbox").className).toContain("border-accent-pink");
  });

  it("renders icon when provided and adds padding", () => {
    const { getByText, getByRole } = render(<Input icon={<span>Icon</span>} />);
    expect(getByText("Icon")).toBeInTheDocument();
    expect(getByRole("textbox").className).toContain("pl-9");
  });

  it("applies custom className to input", () => {
    const { getByRole } = render(<Input className="custom-class" />);
    expect(getByRole("textbox").className).toContain("custom-class");
  });
});
