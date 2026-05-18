import type { PublicChangelog } from "@features/feedback/schemas/public";
import { avatarColor, formatDate, getInitials } from "@features/feedback/utils";

export function UpdateEntry({ entry }: { entry: PublicChangelog }) {
  return (
    <article className="py-10 border-b border-border/60 last:border-0">
      <time className="text-[12.5px] text-muted-foreground font-medium">
        {formatDate(entry.publishedAt)}
      </time>
      <h2 className="mt-3 text-[22px] font-bold leading-tight text-foreground">{entry.title}</h2>
      {entry.excerpt && (
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground line-clamp-3">
          {entry.excerpt}
        </p>
      )}
      <div className="mt-4 flex items-center gap-2">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{ background: avatarColor(entry.authorName) }}
        >
          {getInitials(entry.authorName)}
        </div>
        <span className="text-[12.5px] text-foreground/80">{entry.authorName}</span>
      </div>
    </article>
  );
}
