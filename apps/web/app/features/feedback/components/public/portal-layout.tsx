import { COLOR_OPTIONS } from "@features/branding/constants/branding-options";
import type { BrandingMeta } from "@features/branding/server/parse-branding";
import { PortalTopNav } from "@features/feedback/components/public/portal-top-nav";
import { PublicAuthModal } from "@features/feedback/components/public/public-auth-modal";
import type {
  AuthTab,
  PublicBoard,
  PublicChangelog,
  PublicPost,
  SessionUser,
} from "@features/feedback/schemas/public";
import { useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router";

export type PortalOutletContext = {
  org: { id: string; name: string; slug: string; logo: string | null };
  boards: PublicBoard[];
  posts: PublicPost[];
  changelogEntries: PublicChangelog[];
  changelogNextCursor: string | null;
  votedPostIds: string[];
  sessionUser: SessionUser | null;
  publicUser: { id: string; email: string; name?: string } | null;
  widgetToken: string | null;
  emailSubscriptionsEnabled: boolean;
  isSubscribed: boolean;
  setAuthModal: (tab: AuthTab | null) => void;
};

type LoaderData = {
  org: { id: string; name: string; slug: string; logo: string | null };
  boards: PublicBoard[];
  posts: PublicPost[];
  changelogEntries: PublicChangelog[];
  changelogNextCursor?: string | null;
  votedPostIds: string[] | null;
  sessionUser: SessionUser | null;
  publicUser: { id: string; email: string; name?: string } | null;
  widgetToken: string | null;
  emailSubscriptionsEnabled?: boolean;
  isSubscribed?: boolean;
  branding: BrandingMeta;
};

export function PortalLayout({
  loaderData,
  tabBasePath,
}: {
  loaderData: LoaderData;
  tabBasePath: string;
}) {
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

  const [authModal, setAuthModal] = useState<AuthTab | null>(null);

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

  const outletContext: PortalOutletContext = {
    org,
    boards,
    posts,
    changelogEntries: changelogEntries ?? [],
    changelogNextCursor: loaderData.changelogNextCursor ?? null,
    votedPostIds: votedPostIds ?? [],
    sessionUser: sessionUser ?? null,
    publicUser: publicUser ?? null,
    widgetToken: widgetToken ?? null,
    emailSubscriptionsEnabled: loaderData.emailSubscriptionsEnabled ?? false,
    isSubscribed: loaderData.isSubscribed ?? false,
    setAuthModal,
  };

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
      <PortalTopNav
        orgName={org.name}
        orgLogo={org.logo ?? null}
        tabBasePath={tabBasePath}
        sessionUser={sessionUser ?? null}
        onSubmitPost={() => setAuthModal("sign-in")}
        onSignIn={() => setAuthModal("sign-in")}
        onSignUp={() => setAuthModal("sign-up")}
      />

      <Outlet context={outletContext} />

      {authModal && (
        <PublicAuthModal
          initialTab={authModal}
          onClose={() => setAuthModal(null)}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  );
}
