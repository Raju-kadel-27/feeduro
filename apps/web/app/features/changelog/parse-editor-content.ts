import type { PartialBlock } from "@blocknote/core";
import type { EditorSchema } from "@features/changelog/editor-schema";

const VALID_BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "bulletListItem",
  "numberedListItem",
  "checkListItem",
  "table",
  "image",
  "video",
  "audio",
  "file",
  "codeBlock",
  "youtube",
]);

export function parseEditorContent(
  content: string,
): PartialBlock<EditorSchema["blockSchema"]>[] | undefined {
  try {
    const arr = JSON.parse(content);
    if (!Array.isArray(arr) || arr.length === 0) return undefined;
    const valid = arr.filter((b: unknown): boolean => {
      if (b == null || typeof b !== "object") return false;
      const block = b as Record<string, unknown>;
      return (
        typeof block.type === "string" &&
        VALID_BLOCK_TYPES.has(block.type) &&
        (block.content == null || Array.isArray(block.content))
      );
    }) as PartialBlock<EditorSchema["blockSchema"]>[];
    return valid.length > 0 ? valid : undefined;
  } catch {
    return undefined;
  }
}
