import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

import type { PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { useTheme } from "@providers/theme-provider";
import { useMemo } from "react";

interface Props {
  initialBody: string;
  onChange: (json: string) => void;
}

export function ChangelogEditor({ initialBody, onChange }: Props) {
  const { theme } = useTheme();

  const resolvedTheme: "dark" | "light" = useMemo(() => {
    if (theme === "dark") return "dark";
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  }, [theme]);

  // Empty deps is intentional: parse once at mount only.
  // Re-parsing on every render would reset the editor on every keystroke.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialContent = useMemo((): PartialBlock[] | undefined => {
    try {
      const parsed = JSON.parse(initialBody) as PartialBlock[];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
    } catch {
      return undefined;
    }
  }, []);

  const editor = useCreateBlockNote({
    initialContent,
    uploadFile: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/media.upload", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!json.url) throw new Error(json.error ?? "Upload failed");
      return json.url;
    },
  });

  return (
    <BlockNoteView
      editor={editor}
      theme={resolvedTheme}
      onChange={() => onChange(JSON.stringify(editor.document))}
      className="min-h-[400px]"
    />
  );
}
