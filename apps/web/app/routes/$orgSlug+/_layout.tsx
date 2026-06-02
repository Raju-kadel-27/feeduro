import { AppShell } from "@features/layout/components/app-shell";
import { PageTransition } from "@components/page-transition";
import { Outlet } from "react-router";

export default function OrgLayout() {
  return (
    <AppShell>
      <PageTransition>
        <Outlet />
      </PageTransition>
    </AppShell>
  );
}
