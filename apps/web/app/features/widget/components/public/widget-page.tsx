import { useEffect, useState } from "react";
import type { IdentityPayload, WidgetLoaderData, WidgetPost } from "../../types";
import { WidgetFeed } from "./widget-feed";
import { WidgetFooter } from "./widget-footer";
import { WidgetHeader } from "./widget-header";
import { WidgetInlineForm } from "./widget-inline-form";
import { WidgetPostDetail } from "./widget-post-detail";

export function WidgetPage({ loaderData }: { loaderData: WidgetLoaderData }) {
  const { token, org, board, posts, theme } = loaderData;

  const [view, setView] = useState<"feed" | "detail">("feed");
  const [selectedPost, setSelectedPost] = useState<WidgetPost | null>(null);
  const [localPosts, setLocalPosts] = useState<WidgetPost[]>([]);
  const [identity, setIdentity] = useState<IdentityPayload | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    // Write localStorage before ThemeProvider reads it — child effects run first,
    // so this value is visible when the parent ThemeProvider effect fires.
    if (theme === "dark") {
      root.classList.remove("light");
      root.classList.add("dark");
      localStorage.setItem("feeduro-theme", "dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
      localStorage.setItem("feeduro-theme", "light");
    } else {
      localStorage.removeItem("feeduro-theme");
    }
  }, [theme]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "fdy:identify" && e.data?.data) setIdentity(e.data.data as IdentityPayload);
      if (e.data?.type === "fdy:setTheme") {
        const root = document.documentElement;
        if (e.data.theme === "dark") root.classList.add("dark");
        else root.classList.remove("dark");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function handleSelectPost(post: WidgetPost) {
    setSelectedPost(post);
    setView("detail");
  }

  function handleBack() {
    setSelectedPost(null);
    setView("feed");
  }

  const allPosts = [...localPosts, ...posts];

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden select-none">
      <WidgetHeader
        view={view}
        orgName={org.name}
        boardName={board?.name}
        boardDescription={board?.description}
        onBackClick={handleBack}
      />

      <main className="flex-1 overflow-y-auto overscroll-contain">
        {view === "detail" && selectedPost ? (
          <WidgetPostDetail post={selectedPost} />
        ) : (
          <>
            {board && (
              <WidgetInlineForm
                boardId={board.id}
                orgSlug={org.slug}
                widgetToken={token}
                identity={identity}
                onSuccess={(p) => setLocalPosts((prev) => [p, ...prev])}
              />
            )}
            <WidgetFeed posts={allPosts} onSelectPost={handleSelectPost} />
          </>
        )}
      </main>

      <WidgetFooter />
    </div>
  );
}
