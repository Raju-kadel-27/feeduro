import { createReactBlockSpec } from "@blocknote/react";
import { ImageIcon } from "lucide-react";
import { useState } from "react";

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return url.length > 0;
  } catch {
    return false;
  }
}

function ImageInput({
  onSubmit,
}: {
  onSubmit: (url: string) => void;
}) {
  const [url, setUrl] = useState("");

  return (
    <div className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/30 my-1 w-full">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <ImageIcon className="h-3.5 w-3.5" />
        Image
      </div>
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="Paste image URL…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isValidUrl(url)) {
              e.preventDefault();
              onSubmit(url);
            }
          }}
          className="flex-1 text-sm border rounded px-2 py-1.5 bg-background outline-none focus:ring-1 focus:ring-primary min-w-0"
          // biome-ignore lint/a11y/noAutofocus: intentional for UX
          autoFocus
        />
        <button
          type="button"
          onClick={() => { if (isValidUrl(url)) onSubmit(url); }}
          disabled={!isValidUrl(url)}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 shrink-0"
        >
          Embed
        </button>
      </div>
    </div>
  );
}

export const ImageBlock = createReactBlockSpec(
  {
    type: "image" as const,
    propSchema: {
      url: { default: "" as string },
      alt: { default: "" as string },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      if (!block.props.url) {
        if (!editor.isEditable) return <div />;
        return (
          <ImageInput
            onSubmit={(url) => editor.updateBlock(block, { props: { url } })}
          />
        );
      }

      return (
        <div className="my-1 w-full">
          <img
            src={block.props.url}
            alt={block.props.alt || undefined}
            className="max-w-full h-auto rounded-lg"
          />
        </div>
      );
    },
  },
);
