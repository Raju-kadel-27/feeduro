import { DetailPanel } from "@features/feedback/components/public/detail-panel";
import { FeedbackCard } from "@features/feedback/components/public/feedback-card";
import { FilterRow } from "@features/feedback/components/public/filter-row";
import { InlineFeedbackForm } from "@features/feedback/components/public/inline-feedback-form";
import type { PortalOutletContext } from "@features/feedback/components/public/portal-layout";
import { PublicSidebar } from "@features/feedback/components/public/public-sidebar";
import type { PublicPost, StatusKey } from "@features/feedback/schemas/public";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router";

export function PortalFeedbackTab() {
  const {
    org,
    boards,
    posts,
    votedPostIds,
    sessionUser,
    publicUser,
    widgetToken,
    setAuthModal,
  } = useOutletContext<PortalOutletContext>();

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPostId = searchParams.get("postId");

  function setSelectedPostId(id: string | null) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set("postId", id);
        else next.delete("postId");
        return next;
      },
      { replace: id === null },
    );
  }

  const [activeStatuses, setActiveStatuses] = useState<Set<StatusKey>>(new Set());
  const [sort, setSort] = useState<"trending" | "top" | "new">("trending");
  const [selectedBoardId, setSelectedBoardId] = useState(boards[0]?.id ?? "");
  const [localPosts, setLocalPosts] = useState<PublicPost[]>([]);

  const allPosts = useMemo(() => [...localPosts, ...posts], [localPosts, posts]);

  const filtered = useMemo(() => {
    let result = allPosts;
    if (activeStatuses.size > 0) result = result.filter((p) => activeStatuses.has(p.status));
    if (selectedBoardId) result = result.filter((p) => p.boardId === selectedBoardId);
    if (sort === "top") return [...result].sort((a, b) => b.voteCount - a.voteCount);
    if (sort === "trending")
      return [...result].sort(
        (a, b) => b.voteCount + b.commentCount * 2 - (a.voteCount + a.commentCount * 2),
      );
    return result;
  }, [allPosts, activeStatuses, selectedBoardId, sort]);

  const postCounts = useMemo(
    () =>
      posts.reduce<Record<string, number>>((acc, p) => {
        acc[p.boardId] = (acc[p.boardId] ?? 0) + 1;
        return acc;
      }, {}),
    [posts],
  );

  useEffect(() => {
    const payload: Record<string, string> = { orgId: org.id, type: "board_view" };
    if (selectedBoardId) payload.resourceId = selectedBoardId;
    fetch("/api/portal-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }, [org.id, selectedBoardId]);

  function toggleStatus(id: StatusKey) {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <main className="mx-auto max-w-[1060px] px-6 pt-6 pb-16">
      <div className="flex gap-16">
        <PublicSidebar
          boards={boards}
          postCounts={postCounts}
          selectedBoardId={selectedBoardId}
          onSelectBoard={setSelectedBoardId}
        />
        <section className="min-w-0 flex-1">
          <InlineFeedbackForm
            orgSlug={org.slug}
            boards={boards}
            selectedBoardId={selectedBoardId}
            publicUser={publicUser ?? null}
            widgetToken={widgetToken ?? null}
            sessionUser={sessionUser ?? null}
            onSubmitted={(post) => setLocalPosts((prev) => [post, ...prev])}
            onAuthRequired={() => setAuthModal("sign-in")}
          />
          <FilterRow
            active={activeStatuses}
            toggle={toggleStatus}
            sort={sort}
            setSort={setSort}
          />
          <div className="mt-1">
            {filtered.map((post) => (
              <FeedbackCard
                key={post.id}
                post={post}
                orgSlug={org.slug}
                initialVoted={votedPostIds.includes(post.id)}
                sessionUser={sessionUser ?? null}
                onAuthRequired={() => {
                  if (!sessionUser) setAuthModal("sign-in");
                }}
                onSelectPost={() => setSelectedPostId(post.id)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="flex items-center justify-center py-20 text-base text-muted-foreground">
                {posts.length === 0
                  ? "No feedback yet. Be the first to share!"
                  : "No feedback matches the current filters."}
              </div>
            )}
          </div>
        </section>
      </div>

      {selectedPostId && (
        <DetailPanel
          post={allPosts.find((p) => p.id === selectedPostId) ?? null}
          orgSlug={org.slug}
          onClose={() => setSelectedPostId(null)}
          initialVoted={votedPostIds.includes(selectedPostId)}
          sessionUser={sessionUser ?? null}
          onAuthRequired={() => {
            if (!sessionUser) setAuthModal("sign-in");
          }}
        />
      )}
    </main>
  );
}
