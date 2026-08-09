import { UpdatesView } from "@features/changelog/components/public/updates-view";
import type { PortalOutletContext } from "@features/feedback/components/public/portal-layout";
import { useEffect } from "react";
import { useOutletContext } from "react-router";

export default function SubdomainUpdatesRoute() {
  const {
    org,
    changelogEntries,
    changelogNextCursor,
    sessionUser,
    publicUser,
    emailSubscriptionsEnabled,
    isSubscribed,
    setAuthModal,
  } = useOutletContext<PortalOutletContext>();

  useEffect(() => {
    fetch("/api/portal-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: org.id, type: "updates_view" }),
    }).catch(() => {});
  }, [org.id]);

  return (
    <>
      <main className="mx-auto max-w-[1200px] px-6 pt-6 pb-16">
        <UpdatesView
          entries={changelogEntries}
          initialNextCursor={changelogNextCursor}
          orgId={org.id}
          orgSlug={org.slug}
          subscriptionsEnabled={emailSubscriptionsEnabled}
          isSubscribed={isSubscribed}
          userEmail={sessionUser?.email ?? publicUser?.email ?? null}
          onAuthRequired={() => setAuthModal("sign-in")}
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
