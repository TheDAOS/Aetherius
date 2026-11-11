import type { VaultFile } from "../../types/vault";
import { parseMarkdown } from "./markdownParser";
export function linkMention(source: string, target: VaultFile): string {
  const note = parseMarkdown(target.content ?? "", target.path);
  const names = [
    ...new Set([
      note.title,
      ...note.aliases,
      target.name.replace(/\.md$/i, ""),
    ]),
  ].sort((a, b) => b.length - a.length);
  const pattern = names
    .filter(Boolean)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  if (!pattern) throw new Error("No target title to link");
  const regex = new RegExp(
    `(?<![\\p{L}\\p{N}_])(${pattern})(?![\\p{L}\\p{N}_])`,
    "iu",
  );
  const frontmatter =
    source.match(/^\s*---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/)?.[0] ?? "";
  const body = source.slice(frontmatter.length);
  let linked = false;
  const updated = body
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`|\[\[[^\]]*\]\])/g)
    .map((part, index) => {
      if (index % 2 || linked) return part;
      return part.replace(regex, (phrase) => {
        linked = true;
        return `[[${target.path.replace(/\.md$/i, "")}|${phrase}]]`;
      });
    })
    .join("");
  if (!linked)
    throw new Error("Mention no longer exists outside code or existing links");
  return frontmatter + updated;
}
