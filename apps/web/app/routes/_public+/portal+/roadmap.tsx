import type { PortalOutletContext } from "@features/feedback/components/public/portal-layout";
import { PublicRoadmapView } from "@features/roadmap/components/public/public-roadmap-view";
import { useEffect } from "react";
import { useOutletContext } from "react-router";

export default function SubdomainRoadmapRoute() {
  const { org, boards, posts, votedPostIds, sessionUser, setAuthModal } =
    useOutletContext<PortalOutletContext>();

  useEffect(() => {
    fetch("/api/portal-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: org.id, type: "roadmap_view" }),
    }).catch(() => {});
  }, [org.id]);

  return (
    <>
      <main className="mx-auto max-w-[1200px] px-6 pt-1 pb-16">
        <PublicRoadmapView
          posts={posts}
          boards={boards}
          orgSlug={org.slug}
          votedPostIds={votedPostIds}
          sessionUser={sessionUser ?? null}
          onAuthRequired={() => {
            if (!sessionUser) setAuthModal("sign-in");
          }}
        />
      </main>
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
    </>
  );
}
