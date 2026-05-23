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
import { CreateBoardFab } from "@features/layout/components/create-board-fab";
import { PublicRoadmapView } from "@features/roadmap/components/public-roadmap-view";

type Props = {
  loaderData: {
    org: { id: string; name: string; slug: string };
    boards: PublicBoard[];
    posts: PublicPost[];
    changelogEntries: PublicChangelog[];
    upNextPosts: { id: string; title: string; voteCount: number }[];
    votedPostIds: string[] | null;
    sessionUser: SessionUser | null;
    publicUser: { id: string; email: string; name?: string } | null;
    widgetToken: string | null;
    emailSubscriptionsEnabled?: boolean;
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
  } = loaderData;

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
  } = usePublicBoard({ posts, sessionUser });

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
      <TopNav
        orgName={org.name}
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
              totalCount={posts.length}
              selectedBoardId={selectedBoardId}
              onSelectBoard={setSelectedBoardId}
            />
            <section className="min-w-0 flex-1">
              <InlineFeedbackForm
                orgSlug={org.slug}
                boards={boards}
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
          />
        )}
      </main>

      <CreateBoardFab />

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
