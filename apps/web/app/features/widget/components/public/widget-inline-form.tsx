import { X } from "lucide-react";
import { useState } from "react";
import type { IdentityPayload, WidgetPost } from "../../types";

interface WidgetInlineFormProps {
  boardId: string;
  orgSlug: string;
  widgetToken: string;
  identity: IdentityPayload | null;
  onSuccess: (post: WidgetPost) => void;
}

export function WidgetInlineForm({ boardId, orgSlug, widgetToken, identity, onSuccess }: WidgetInlineFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function clear() {
    setTitle("");
    setDescription("");
  }

  async function handleSubmit() {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/public-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widgetToken,
          orgSlug,
          boardId,
          title: title.trim(),
          description: description.trim() || undefined,
          submitter: identity ?? undefined,
        }),
      });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Submission failed");
      onSuccess({
        id: json.id ?? String(Date.now()),
        title: title.trim(),
        description: description.trim() || null,
        status: "pending",
        voteCount: 0,
        commentCount: 0,
      });
      clear();
    } catch {
      // form stays open for retry
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-b border-border bg-card">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40">
        <span className="text-[11.5px] font-medium text-muted-foreground">Share feedback</span>
        <button type="button" onClick={clear} className="ml-auto text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="px-4 pt-3 pb-1 space-y-1.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Submission title"
          className="w-full bg-transparent text-[13.5px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details (optional)"
          rows={1}
          className="w-full resize-none bg-transparent text-[12px] text-muted-foreground placeholder:text-muted-foreground/35 focus:outline-none"
        />
      </div>
      <div className="flex items-center justify-end px-4 py-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!title.trim() || submitting}
          className="px-4 py-1.5 rounded-md bg-foreground text-background text-[12px] font-semibold hover:bg-foreground/90 disabled:opacity-40 transition-colors"
        >
          {submitting ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}
