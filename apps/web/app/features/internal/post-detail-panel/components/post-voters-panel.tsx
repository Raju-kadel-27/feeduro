import { timeAgo } from "@features/feedback/utils";
import { cn } from "@lib/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { Voter } from "../hooks/use-voter-data";

function formatMrr(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount}`;
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-teal-500", "bg-indigo-500",
];

function VoterAvatar({ name, email }: { name: string | null; email: string }) {
  const display = name ?? email;
  const color = AVATAR_COLORS[display.charCodeAt(0) % AVATAR_COLORS.length];
  const initials = display.slice(0, 2).toUpperCase();
  return (
    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0", color)}>
      {initials}
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary leading-none">
      {plan}
    </span>
  );
}

function VoterRow({ voter }: { voter: Voter }) {
  const display = voter.name ?? voter.email;
  const secondary = [voter.role, voter.location].filter(Boolean).join(" · ");
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <VoterAvatar name={voter.name} email={voter.email} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-foreground truncate">{display}</span>
          {voter.plan && <PlanBadge plan={voter.plan} />}
        </div>
        {secondary && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{secondary}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        {voter.mrr != null && voter.mrr > 0 && (
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatMrr(voter.mrr)}/mo
          </span>
        )}
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {timeAgo(voter.votedAt)}
        </span>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-2.5 py-1.5 animate-pulse">
      <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-2.5 bg-muted rounded w-2/3" />
        <div className="h-2 bg-muted rounded w-1/3" />
      </div>
    </div>
  );
}

export function PostVotersPanel({
  voters,
  voteCount,
  isLoading,
}: {
  voters: Voter[];
  voteCount: number;
  isLoading: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? voters : voters.slice(0, 5);
  const hiddenCount = voters.length - 5;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Voters
          {voteCount > 0 && <span className="ml-1.5 normal-case font-normal">· {voteCount}</span>}
        </h3>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-150", !expanded && "-rotate-90")} />
        </button>
      </div>

      {expanded && (
        <div className="space-y-0 divide-y divide-border/50">
          {isLoading ? (
            <>{[0, 1, 2].map((i) => <SkeletonRow key={i} />)}</>
          ) : voters.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              No voter data yet. Identify users via the widget SDK to see who's voting.
            </p>
          ) : (
            <>
              {visible.map((v) => <VoterRow key={v.email} voter={v} />)}
              {!showAll && hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="w-full text-left text-xs text-primary hover:underline pt-2"
                >
                  Show {hiddenCount} more
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
