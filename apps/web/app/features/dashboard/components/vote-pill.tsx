import { cn } from "@lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronUp } from "lucide-react";
import type { Post } from "../types";

export function VotePill({ post, queryKey }: { post: Post; queryKey: readonly unknown[] }) {
  const qc = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      return res.json() as Promise<{ voted: boolean }>;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKey as unknown[] });
      const prev = qc.getQueryData<{ posts: Post[] }>(queryKey as unknown[]);
      qc.setQueryData<{ posts: Post[] }>(queryKey as unknown[], (old) => {
        if (!old) return old;
        return {
          posts: old.posts.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  hasVoted: !p.hasVoted,
                  voteCount: p.hasVoted ? p.voteCount - 1 : p.voteCount + 1,
                }
              : p,
          ),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey as unknown[], ctx.prev);
    },
  });

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        mutate();
      }}
      disabled={isPending}
      className={cn(
        "group/vote flex flex-col items-center justify-center gap-0.5 w-8 h-8 border-[1.5px] transition-all duration-150 shrink-0 select-none",
        post.hasVoted
          ? "border-foreground/50 bg-muted text-foreground"
          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted/50",
        isPending && "opacity-50 cursor-not-allowed",
      )}
    >
      <ChevronUp className={cn("h-3 w-3 transition-transform duration-150 group-hover/vote:-translate-y-0.5", post.hasVoted ? "stroke-[2.5]" : "stroke-[1.75]")} />
      <span className="text-[10px] font-semibold leading-none tabular-nums">{post.voteCount}</span>
    </button>
  );
}
