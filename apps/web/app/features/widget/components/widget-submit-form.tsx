import { useState } from "react";
import type { WidgetPost } from "../types";

interface WidgetSubmitFormProps {
  boardId: string;
  orgSlug: string;
  widgetToken: string;
  identity: {
    id: string;
    email?: string;
    name?: string;
    signature?: string;
  } | null;
  onSuccess: (newPost: WidgetPost) => void;
  onBack: () => void;
}

export function WidgetSubmitForm({
  boardId,
  orgSlug,
  widgetToken,
  identity,
  onSuccess,
  onBack,
}: WidgetSubmitFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
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
      const json = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) throw new Error(json.error ?? "Submission failed");

      onSuccess({
        id: json.id ?? Date.now().toString(),
        title: title.trim(),
        description: description.trim() || null,
        status: "pending",
        voteCount: 0,
        commentCount: 0,
      });

      setSubmitted(true);
      setTitle("");
      setDescription("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
        <div className="text-3xl">🎉</div>
        <p className="font-semibold text-[14px] mt-1">Thank you!</p>
        <p className="text-[12px] text-muted-foreground">Your feedback was submitted.</p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            onBack();
          }}
          className="mt-4 text-[12px] text-primary hover:underline underline-offset-2 transition-colors"
        >
          Back to feedback
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            Title <span className="text-destructive">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A short, clear summary"
            required
            className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2.5 text-[13px] outline-none focus:border-primary placeholder:text-muted-foreground transition-colors"
          />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            Details <span className="normal-case opacity-60">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="What happened? What did you expect?"
            className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-[13px] outline-none focus:border-primary placeholder:text-muted-foreground resize-none transition-colors"
          />
        </div>
        {error && <p className="text-[12px] text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="w-full h-9 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Submitting…" : "Submit Feedback"}
        </button>
      </form>
    </div>
  );
}
