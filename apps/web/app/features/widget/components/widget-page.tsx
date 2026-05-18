import { useEffect, useState } from "react";
import type { IdentityPayload, WidgetLoaderData, WidgetPost } from "../types";
import { WidgetFeed } from "./widget-feed";
import { WidgetFooter } from "./widget-footer";
import { WidgetHeader } from "./widget-header";
import { WidgetSubmitForm } from "./widget-submit-form";

interface WidgetPageProps {
  loaderData: WidgetLoaderData;
}

export function WidgetPage({ loaderData }: WidgetPageProps) {
  const { token, org, board, posts, theme } = loaderData;

  const [view, setView] = useState<"feed" | "submit">("feed");
  const [localPosts, setLocalPosts] = useState<WidgetPost[]>([]);
  const [identity, setIdentity] = useState<IdentityPayload | null>(null);

  // Apply the configured theme, overriding the system default from ThemeProvider
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    }
    // "auto" → system media query handles it via ThemeProvider
  }, [theme]);

  // Accept identity data from parent page via postMessage
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "fdy:identify" && e.data?.data) {
        setIdentity(e.data.data as IdentityPayload);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function openSubmit() {
    setView("submit");
  }

  function handleBack() {
    setView("feed");
  }

  function handlePostSuccess(newPost: WidgetPost) {
    setLocalPosts((prev) => [newPost, ...prev]);
  }

  const allPosts = [...localPosts, ...posts];

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden select-none">
      <WidgetHeader
        view={view}
        orgName={org.name}
        hasBoard={!!board}
        onSubmitClick={openSubmit}
        onBackClick={handleBack}
      />

      <main className="flex-1 overflow-y-auto overscroll-contain">
        {view === "feed" ? (
          <WidgetFeed posts={allPosts} />
        ) : board ? (
          <WidgetSubmitForm
            boardId={board.id}
            orgSlug={org.slug}
            widgetToken={token}
            identity={identity}
            onSuccess={handlePostSuccess}
            onBack={handleBack}
          />
        ) : null}
      </main>

      <WidgetFooter />
    </div>
  );
}
