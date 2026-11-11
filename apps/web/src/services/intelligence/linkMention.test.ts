import { expect, it } from "vitest";
import { linkMention } from "./linkMention";

const target = {
  path: "notes/research.md",
  name: "research.md",
  type: "file" as const,
  content: "---\ntitle: Distributed Systems\naliases: [DS]\n---\n# Notes",
};
it("links the actual title while preserving frontmatter and code", () => {
  const content =
    "---\ntitle: Distributed Systems\n---\n`Distributed Systems` and Distributed Systems.";
  expect(linkMention(content, target)).toBe(
    "---\ntitle: Distributed Systems\n---\n`Distributed Systems` and [[notes/research|Distributed Systems]].",
  );
});
it("links aliases using a resolvable full path", () =>
  expect(linkMention("Study DS today.", target)).toBe(
    "Study [[notes/research|DS]] today.",
  ));
it("does not commit a no-op change", () =>
  expect(() => linkMention("`DS`", target)).toThrow(/Mention no longer/));
