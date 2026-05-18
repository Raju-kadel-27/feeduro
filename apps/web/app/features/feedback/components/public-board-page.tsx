import { UpdatesView } from "@features/changelog/components/updates-view";
import { DetailPanel } from "@features/feedback/components/detail-panel";
import { FeedbackCard } from "@features/feedback/components/feedback-card";
import { FeedbackModal } from "@features/feedback/components/feedback-modal";
import { FilterRow } from "@features/feedback/components/filter-row";
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
import { Megaphone } from "lucide-react";

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

  const {
    currentTab,
    activeStatuses,
    sort,
    setSort,
    selectedBoardId,
    setSelectedBoardId,
    setSearchParams,
    showModal,
    setShowModal,
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
    <div className="min-h-screen">
      <TopNav
        orgName={org.name}
        sessionUser={sessionUser ?? null}
        currentTab={currentTab}
        onSubmitPost={() => setShowModal(true)}
        onSignIn={() => setAuthModal("sign-in")}
        onSignUp={() => setAuthModal("sign-up")}
      />

      <main className="mx-auto max-w-[1440px] px-6 pt-16 pb-32">
        {currentTab === "feedback" && (
          <div className="flex gap-10">
            <PublicSidebar
              boards={boards}
              selectedBoardId={selectedBoardId}
              onSelectBoard={setSelectedBoardId}
            />
            <section className="min-w-0 flex-1">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">
                    {selectedBoardId === "all"
                      ? "All Feedback"
                      : (boards.find((b) => b.id === selectedBoardId)?.name ?? "Feedback")}
                  </h1>
                  <p className="mt-0.5 text-[13px] text-slate-600">
                    {filtered.length} posts · vote on what matters most to you
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
                >
                  <Megaphone className="h-4 w-4" />
                  Give Feedback
                </button>
              </div>
              <FilterRow
                active={activeStatuses}
                toggle={toggleStatus}
                sort={sort}
                setSort={setSort}
              />
              <div className="mt-4">
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
                  <div className="flex items-center justify-center py-20 text-sm text-slate-500">
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
            orgSlug={org.slug}
            votedPostIds={safeVotedIds}
            sessionUser={sessionUser ?? null}
            onAuthRequired={openFeedbackOrAuth}
          />
        )}

        {currentTab === "updates" && (
          <div className="flex gap-10">
            <PublicSidebar
              boards={boards}
              onSelectBoard={(id) => {
                setSelectedBoardId(id);
                setSearchParams({});
              }}
            />
            <UpdatesView entries={changelogEntries ?? []} />
          </div>
        )}
      </main>

      <CreateBoardFab />

      {showModal && (
        <FeedbackModal
          orgSlug={org.slug}
          boards={boards}
          publicUser={publicUser ?? null}
          widgetToken={widgetToken ?? null}
          onClose={() => setShowModal(false)}
          onSubmitted={handleSubmitted}
        />
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
