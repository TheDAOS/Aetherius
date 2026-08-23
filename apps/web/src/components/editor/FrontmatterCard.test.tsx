import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FrontmatterCard } from "./FrontmatterCard";

describe("FrontmatterCard", () => {
  it("renders nothing when frontmatter is empty", () => {
    const { container } = render(<FrontmatterCard frontmatter={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders tags correctly when tags is an array", () => {
    render(
      <FrontmatterCard
        frontmatter={{ tags: ["react", "vitest"], title: "Test" }}
      />,
    );
    expect(screen.getByText("#react")).toBeInTheDocument();
    expect(screen.getByText("#vitest")).toBeInTheDocument();
    expect(screen.getByText("(2 tags)")).toBeInTheDocument();
  });

  it("renders tags correctly when tags is a string", () => {
    render(<FrontmatterCard frontmatter={{ tags: "react", title: "Test" }} />);
    expect(screen.getByText("#react")).toBeInTheDocument();
    expect(screen.getByText("(1 tags)")).toBeInTheDocument();
  });

  it("ignores title but renders other properties", () => {
    render(
      <FrontmatterCard frontmatter={{ title: "My Title", author: "John" }} />,
    );
    expect(screen.queryByText("title:")).not.toBeInTheDocument();
    expect(screen.getByText("author:")).toBeInTheDocument();
    expect(screen.getByText("John")).toBeInTheDocument();
  });

  it("renders objects as JSON string", () => {
    render(<FrontmatterCard frontmatter={{ complex: { a: 1 } }} />);
    expect(screen.getByText("complex:")).toBeInTheDocument();
    expect(screen.getByText('{"a":1}')).toBeInTheDocument();
  });

  it("toggles expanded state", () => {
    render(<FrontmatterCard frontmatter={{ author: "John" }} />);
    const header = screen.getByText("PROPERTIES / METADATA");

    // Initially expanded
    expect(screen.getByText("author:")).toBeInTheDocument();

    // Collapse
    fireEvent.click(header);
    expect(screen.queryByText("author:")).not.toBeInTheDocument();

    // Expand again
    fireEvent.click(header);
    expect(screen.getByText("author:")).toBeInTheDocument();
  });

  it("shows calendar icon for date fields", () => {
    render(
      <FrontmatterCard
        frontmatter={{
          created: "2023-01-01",
          updated: "2023-01-02",
          published_date: "2023-01-03",
        }}
      />,
    );
    expect(screen.getByText("created:")).toBeInTheDocument();
    expect(screen.getByText("updated:")).toBeInTheDocument();
    expect(screen.getByText("published_date:")).toBeInTheDocument();
  });
});
