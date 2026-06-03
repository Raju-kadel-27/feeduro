import { AppShell } from "@features/layout/components/app-shell";
import { PageTransition } from "@components/page-transition";
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
