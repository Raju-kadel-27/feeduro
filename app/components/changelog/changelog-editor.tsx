import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import type { Block } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { useTheme } from "@components/providers/theme-provider";

interface Props {
  initialContent: string;
  onChange: (content: string) => void;
  editable?: boolean;
}

export default function ChangelogEditor({ initialContent, onChange, editable = true }: Props) {
  const { theme } = useTheme();
  const resolvedTheme: "light" | "dark" =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

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
  ]);

  const parsed: Block[] | undefined = (() => {
    try {
      const arr = JSON.parse(initialContent);
      if (!Array.isArray(arr) || arr.length === 0) return undefined;
      const valid = arr.filter(
        (b): b is Block =>
          b != null &&
          typeof b.type === "string" &&
          VALID_BLOCK_TYPES.has(b.type) &&
          Array.isArray(b.content),
      );
      return valid.length > 0 ? valid : undefined;
    } catch {
      return undefined;
    }
  })();

  const editor = useCreateBlockNote({ initialContent: parsed });

  return (
    <BlockNoteView
      editor={editor}
      theme={resolvedTheme}
      editable={editable}
      onChange={() => {
        onChange(JSON.stringify(editor.document));
      }}
      className="min-h-[400px]"
    />
  );
}
