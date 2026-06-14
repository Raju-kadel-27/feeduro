import { PageTransition } from "@components/page-transition";
import { AppShell } from "@features/internal/layout/components/app-shell";
import { Outlet, useMatches } from "react-router";

export default function OrgLayout() {
  const matches = useMatches();
  const leaf = matches[matches.length - 1];

  if (leaf?.id === "routes/$orgSlug+/_index") {
    return <Outlet />;
  }

  return (
    <AppShell>
      <PageTransition>
        <Outlet />
      </PageTransition>
    </AppShell>
  );
}
