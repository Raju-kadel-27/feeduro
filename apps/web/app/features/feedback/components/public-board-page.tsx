import { COLOR_OPTIONS } from "@features/branding/constants/branding-options";
import type { BrandingMeta } from "@features/branding/server/parse-branding";
import { UpdatesView } from "@features/changelog/components/updates-view";
import { DetailPanel } from "@features/feedback/components/detail-panel";
import { FeedbackCard } from "@features/feedback/components/feedback-card";
import { FilterRow } from "@features/feedback/components/filter-row";
import { InlineFeedbackForm } from "@features/feedback/components/inline-feedback-form";
import { PublicAuthModal } from "@features/feedback/components/public-auth-modal";
import { PublicSidebar } from "@features/feedback/components/public-sidebar";
import { TopNav } from "@features/feedback/components/top-nav";
import { usePublicBoard } from "@features/feedback/hooks/use-public-board";
import type {
  PublicBoard,
  PublicChangelog,
  PublicPost,
  SessionUser,
} from "@features/feedback/schemas/public";
import { PublicRoadmapView } from "@features/roadmap/components/public-roadmap-view";
import { useEffect, useMemo } from "react";

type Props = {
  loaderData: {
    org: { id: string; name: string; slug: string; logo: string | null };
    boards: PublicBoard[];
    posts: PublicPost[];
    changelogEntries: PublicChangelog[];
    upNextPosts: { id: string; title: string; voteCount: number }[];
    votedPostIds: string[] | null;
    sessionUser: SessionUser | null;
    publicUser: { id: string; email: string; name?: string } | null;
    widgetToken: string | null;
    emailSubscriptionsEnabled?: boolean;
    isSubscribed?: boolean;
    branding: BrandingMeta;
  };
};

export function PublicBoardPage({ loaderData }: Props) {
  const {
    org,
    boards,
    posts,
    changelogEntries,
    votedPostIds,
    sessionUser,
    publicUser,
    widgetToken,
    branding,
  } = loaderData;

  const primaryHex = useMemo(
    () => COLOR_OPTIONS.find((c) => c.value === branding.primaryColor)?.hex ?? "#6366f1",
    [branding.primaryColor],
  );

  useEffect(() => {
    if (branding.theme === "dynamic") return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(branding.theme);
    return () => {
      root.classList.remove(branding.theme);
    };
  }, [branding.theme]);

  // Fire-and-forget: record the board visit for analytics without blocking render
  useEffect(() => {
    fetch("/api/board-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: org.id }),
    }).catch(() => {});
  }, [org.id]);

  const safeVotedIds = votedPostIds ?? [];

  const postCounts = posts.reduce<Record<string, number>>((acc, p) => {
    acc[p.boardId] = (acc[p.boardId] ?? 0) + 1;
    return acc;
  }, {});

  const {
    currentTab,
    activeStatuses,
    sort,
    setSort,
    selectedBoardId,
    setSelectedBoardId,
    authModal,
    setAuthModal,
    selectedPostId,
    setSelectedPostId,
    filtered,
    allPosts,
    toggleStatus,
    handleSubmitted,
    openFeedbackOrAuth,
  } = usePublicBoard({ posts, boards, sessionUser });

  return (
    <div
      className="min-h-screen"
      style={
        {
          fontFamily: "'Inter', sans-serif",
          "--primary": primaryHex,
          "--primary-foreground": "#ffffff",
          "--ring": primaryHex,
        } as React.CSSProperties
      }
    >
      <TopNav
        orgName={org.name}
        orgLogo={org.logo ?? null}
        sessionUser={sessionUser ?? null}
        currentTab={currentTab}
        onSubmitPost={() => setAuthModal("sign-in")}
        onSignIn={() => setAuthModal("sign-in")}
        onSignUp={() => setAuthModal("sign-up")}
      />

      <main className={`mx-auto px-6 pb-16 ${currentTab === "roadmap" ? "max-w-[1200px] pt-1" : "max-w-[1060px] pt-6"}`}>
        {currentTab === "feedback" && (
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
                onSubmitted={handleSubmitted}
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
                    initialVoted={safeVotedIds.includes(post.id)}
                    sessionUser={sessionUser ?? null}
                    onAuthRequired={openFeedbackOrAuth}
                    onSelectPost={() => setSelectedPostId(post.id)}
                  />
                ))}
                {filtered.length === 0 && (
                  <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                    {posts.length === 0
                      ? "No feedback yet. Be the first to share!"
                      : "No feedback matches the current filters."}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {currentTab === "roadmap" && (
          <PublicRoadmapView
            posts={allPosts}
            boards={boards}
            orgSlug={org.slug}
            votedPostIds={safeVotedIds}
            sessionUser={sessionUser ?? null}
            onAuthRequired={openFeedbackOrAuth}
          />
        )}

        {currentTab === "updates" && (
          <UpdatesView
            entries={changelogEntries ?? []}
            orgSlug={org.slug}
            subscriptionsEnabled={loaderData.emailSubscriptionsEnabled ?? false}
            isSubscribed={loaderData.isSubscribed ?? false}
            userEmail={sessionUser?.email ?? publicUser?.email ?? null}
            onAuthRequired={() => setAuthModal("sign-in")}
          />
        )}
      </main>

      {(currentTab === "roadmap" || currentTab === "updates") && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center">
          <a
            href="https://feeduro.com"
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/90 backdrop-blur-sm px-5 h-9 text-[12.5px] font-medium text-foreground/70 shadow-md hover:text-foreground hover:bg-card transition-colors"
          >
            Powered by Feeduro
          </a>
        </div>
      )}

      {authModal && (
        <PublicAuthModal
          initialTab={authModal}
          onClose={() => setAuthModal(null)}
          onSuccess={() => window.location.reload()}
        />
      )}

      {selectedPostId && (
        <DetailPanel
          post={allPosts.find((p) => p.id === selectedPostId) ?? null}
          orgSlug={org.slug}
          onClose={() => setSelectedPostId(null)}
          initialVoted={safeVotedIds.includes(selectedPostId)}
          sessionUser={sessionUser ?? null}
          onAuthRequired={openFeedbackOrAuth}
        />
      )}
    </div>
  );
}
