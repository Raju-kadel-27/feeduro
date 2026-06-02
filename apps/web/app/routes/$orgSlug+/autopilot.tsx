
import { Spinner } from "@components/ui/spinner";
import type { SuggestionWithPosts } from "@features/autopilot/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Check, ExternalLink, Merge, X } from "lucide-react";
import { Link, useParams } from "react-router";

const CONFIDENCE_STYLES: Record<string, string> = {
  low: "bg-yellow-100 text-yellow-800",
  medium: "bg-orange-100 text-orange-800",
  high: "bg-red-100 text-red-800",
};

export default function AutopilotPage() {
  const { orgSlug } = useParams();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["autopilot-suggestions"],
    queryFn: async () => {
      const res = await fetch("/api/autopilot");
      const json = (await res.json()) as { suggestions: SuggestionWithPosts[] };
      return json.suggestions;
    },
  });

  const { mutate: resolve, isPending } = useMutation({
    mutationFn: async ({
      suggestionId,
      intent,
    }: {
      suggestionId: string;
      intent: "approve" | "dismiss";
    }) => {
      const res = await fetch("/api/autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId, intent }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["autopilot-suggestions"] }),
  });

  const suggestions = data ?? [];

  return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-semibold">Autopilot</h1>
              <p className="text-sm text-muted-foreground">Review AI-detected duplicate posts</p>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Spinner className="size-5 text-muted-foreground" />
            </div>
          )}

          {!isLoading && suggestions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <Check className="h-10 w-10 text-green-500" />
              <p className="font-medium">All clear</p>
              <p className="text-sm text-muted-foreground">
                No pending duplicate suggestions right now.
              </p>
            </div>
          )}

          {suggestions.map((s) => (
            <div key={s.id} className="border rounded-lg p-5 space-y-4 bg-card">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${CONFIDENCE_STYLES[s.confidence]}`}
                    >
                      {s.confidence} confidence
                    </span>
                    <span className="text-xs text-muted-foreground">{s.sourcePost.boardName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{s.reason}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border bg-muted/40 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    New post
                  </p>
                  <p className="text-sm font-medium leading-snug">{s.sourcePost.title}</p>
                  {s.sourcePost.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {s.sourcePost.description}
                    </p>
                  )}
                </div>

                <div className="rounded-md border bg-muted/40 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Existing post
                  </p>
                  {s.targetPost ? (
                    <>
                      <p className="text-sm font-medium leading-snug">{s.targetPost.title}</p>
                      <Link
                        to={`/${orgSlug}/feedback/${s.targetPost.id}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        View post <ExternalLink className="h-3 w-3" />
                      </Link>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Post not found</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => resolve({ suggestionId: s.id, intent: "approve" })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <Merge className="h-4 w-4" /> Merge
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => resolve({ suggestionId: s.id, intent: "dismiss" })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  <X className="h-4 w-4" /> Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="flex items-center justify-center py-20 text-sm text-destructive">
      Failed to load Autopilot inbox.
    </div>
  );
}
