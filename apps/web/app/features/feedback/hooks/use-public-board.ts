import type {
  AuthTab,
  PublicPost,
  PublicTab,
  SessionUser,
  StatusKey,
} from "@features/feedback/schemas/public";
import { useState } from "react";
import { useSearchParams } from "react-router";

type Options = {
  posts: PublicPost[];
  sessionUser: SessionUser | null;
};

export function usePublicBoard({ posts, sessionUser }: Options) {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const currentTab: PublicTab = rawTab === "roadmap" || rawTab === "updates" ? rawTab : "feedback";

  const [activeStatuses, setActiveStatuses] = useState<Set<StatusKey>>(new Set());
  const [sort, setSort] = useState<"trending" | "top" | "new">("trending");
  const [selectedBoardId, setSelectedBoardId] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [localPosts, setLocalPosts] = useState<PublicPost[]>([]);
  const [authModal, setAuthModal] = useState<AuthTab | null>(null);

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

  const allPosts = [...localPosts, ...posts];

  let filtered = allPosts;
  if (activeStatuses.size > 0) filtered = filtered.filter((p) => activeStatuses.has(p.status));
  if (selectedBoardId !== "all") filtered = filtered.filter((p) => p.boardId === selectedBoardId);
  if (sort === "top") filtered = [...filtered].sort((a, b) => b.voteCount - a.voteCount);
  else if (sort === "trending") filtered = [...filtered].sort((a, b) => (b.voteCount + b.commentCount * 2) - (a.voteCount + a.commentCount * 2));

  function toggleStatus(id: StatusKey) {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSubmitted(post: PublicPost) {
    setLocalPosts((prev) => [post, ...prev]);
  }

  function openFeedbackOrAuth() {
    if (sessionUser) setShowModal(true);
    else setAuthModal("sign-in");
  }

  return {
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
  };
}
