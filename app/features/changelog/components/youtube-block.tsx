import { createReactBlockSpec } from "@blocknote/react";
import { PlaySquare } from "lucide-react";
import { useState } from "react";

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&\n?#]+)/,
  );
  return match?.[1] ?? null;
}

function YouTubeInput({
  initialUrl,
  onSubmit,
}: {
  initialUrl: string;
  onSubmit: (url: string) => void;
}) {
  const [url, setUrl] = useState(initialUrl);

  return (
    <div className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/30 my-1 w-full">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <PlaySquare className="h-3.5 w-3.5" />
        YouTube Embed
      </div>
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="Paste YouTube URL…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (extractYouTubeId(url)) onSubmit(url);
            }
          }}
          className="flex-1 text-sm border rounded px-2 py-1.5 bg-background outline-none focus:ring-1 focus:ring-primary min-w-0"
          // biome-ignore lint/a11y/noAutofocus: intentional for UX
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            if (extractYouTubeId(url)) onSubmit(url);
          }}
          disabled={!extractYouTubeId(url)}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 shrink-0"
        >
          Embed
        </button>
      </div>
    </div>
  );
}

export const YouTubeBlock = createReactBlockSpec(
  {
    type: "youtube" as const,
    propSchema: {
      url: { default: "" as string },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const videoId = extractYouTubeId(block.props.url);

      if (!videoId) {
        if (!editor.isEditable) return <div />;
        return (
          <YouTubeInput
            initialUrl={block.props.url}
            onSubmit={(url) => editor.updateBlock(block, { props: { url } })}
          />
        );
      }

      return (
        <div className="my-1 w-full">
          <div
            className="relative w-full rounded-lg overflow-hidden"
            style={{ paddingTop: "56.25%" }}
          >
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube video"
            />
          </div>
        </div>
      );
    },
  },
);
