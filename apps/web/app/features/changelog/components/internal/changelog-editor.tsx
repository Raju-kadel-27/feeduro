import "@blocknote/core/fonts/inter.css";
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from "@blocknote/core";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { schema } from "@features/changelog/editor-schema";
import { parseEditorContent } from "@features/changelog/parse-editor-content";
import { useTheme } from "@providers/theme-provider";
import { ImageIcon, PlaySquare, VideoIcon } from "lucide-react";

// Slash menu titles from built-in blocks that we've replaced with custom ones.
// Filter them out so we don't get duplicates alongside our custom items.
const REPLACED_DEFAULT_TITLES = new Set(["Image", "Video"]);

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

  const editor = useCreateBlockNote({ schema, initialContent: parseEditorContent(initialContent) });

  return (
    <BlockNoteView
      editor={editor}
      theme={resolvedTheme}
      editable={editable}
      onChange={() => {
        onChange(JSON.stringify(editor.document));
      }}
      className="min-h-[400px]"
    >
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          filterSuggestionItems(
            [
              ...getDefaultReactSlashMenuItems(editor).filter(
                (item) => !REPLACED_DEFAULT_TITLES.has(item.title),
              ),
              {
                title: "Image",
                subtext: "Embed an image from a URL or upload",
                onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "image" }),
                group: "Media",
                icon: <ImageIcon className="h-4 w-4" />,
                aliases: ["image", "img", "photo", "picture"],
                badge: undefined,
              },
              {
                title: "Video",
                subtext: "Embed a video from a URL or upload",
                onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "video" }),
                group: "Media",
                icon: <VideoIcon className="h-4 w-4" />,
                aliases: ["video", "mp4", "webm", "clip"],
                badge: undefined,
              },
              {
                title: "YouTube",
                subtext: "Embed a YouTube video",
                onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "youtube" }),
                group: "Media",
                icon: <PlaySquare className="h-4 w-4" />,
                aliases: ["youtube", "yt"],
                badge: undefined,
              },
            ],
            query,
          )
        }
      />
    </BlockNoteView>
  );
}
