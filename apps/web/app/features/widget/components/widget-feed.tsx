import { useState } from "react";
import type { StatusKey } from "../constants";
import type { WidgetPost } from "../types";
import { WidgetCard } from "./widget-card";
import { WidgetFilterBar, type WidgetSort } from "./widget-filter-bar";

interface WidgetFeedProps {
  posts: WidgetPost[];
  onSelectPost: (post: WidgetPost) => void;
}

export function WidgetFeed({ posts, onSelectPost }: WidgetFeedProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<WidgetSort>("new");
  const [active, setActive] = useState<Set<StatusKey>>(new Set());

  function toggleStatus(id: StatusKey) {
    setActive((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  let filtered = posts.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (active.size > 0 && !active.has(p.status)) return false;
    return true;
  });

  if (sort === "top") filtered = [...filtered].sort((a, b) => b.voteCount - a.voteCount);

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-1 text-muted-foreground">
        <p className="text-[13px]">No feedback yet.</p>
        <p className="text-[12px] opacity-70">Be the first to share!</p>
      </div>
    );
  }

  return (
    <>
      <WidgetFilterBar
        search={search}
        onSearch={setSearch}
        sort={sort}
        onSort={setSort}
        active={active}
        onToggle={toggleStatus}
      />
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-[12px] text-muted-foreground">
          No posts match the current filters.
        </div>
      ) : (
        <ul>
          {filtered.map((post) => (
            <li key={post.id}>
              <WidgetCard post={post} onSelect={() => onSelectPost(post)} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
