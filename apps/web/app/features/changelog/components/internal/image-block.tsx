import { createReactBlockSpec } from "@blocknote/react";
import { cn } from "@lib/utils";
import { ImageIcon, Link2, Upload } from "lucide-react";
import { useRef, useState } from "react";

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return url.length > 0;
  } catch {
    return false;
  }
}

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/media/upload", { method: "POST", body: fd });
  const json = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed");
  return json.url;
}

function ImageInput({ onSubmit }: { onSubmit: (url: string) => void }) {
  const [tab, setTab] = useState<"upload" | "url">("url");
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError("");
    setUploading(true);
    try {
      const uploadedUrl = await uploadFile(file);
      onSubmit(uploadedUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/30 my-1 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" />
          Image
        </div>
        <div className="flex rounded-md border border-border overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setTab("upload")}
            className={cn(
              "px-2 py-1 flex items-center gap-1 transition-colors",
              tab === "upload"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50",
            )}
          >
            <Upload className="h-3 w-3" />
            Upload
          </button>
          <button
            type="button"
            onClick={() => setTab("url")}
            className={cn(
              "px-2 py-1 flex items-center gap-1 border-l border-border transition-colors",
              tab === "url"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50",
            )}
          >
            <Link2 className="h-3 w-3" />
            URL
          </button>
        </div>
      </div>

      {tab === "upload" ? (
        <>
          <button
            type="button"
            onClick={() => !uploading && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            disabled={uploading}
            className={cn(
              "flex flex-col items-center gap-1.5 w-full py-6 rounded-md border-2 border-dashed transition-colors text-sm text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60",
              dragging
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-muted-foreground/50",
            )}
          >
            <Upload className="h-5 w-5" />
            <span>{uploading ? "Uploading…" : "Drop image or click to browse"}</span>
            <span className="text-xs text-muted-foreground/60">JPEG, PNG, WebP, GIF · max 5 MB</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </>
      ) : (
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
            onClick={() => {
              if (isValidUrl(url)) onSubmit(url);
            }}
            disabled={!isValidUrl(url)}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 shrink-0"
          >
            Embed
          </button>
        </div>
      )}

      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
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
        return <ImageInput onSubmit={(url) => editor.updateBlock(block, { props: { url } })} />;
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
