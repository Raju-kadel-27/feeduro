import { SidebarTrigger } from "@components/ui/sidebar";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";

export function IntegrationPageHeader({ title, children }: { title: string; children: ReactNode }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <span className="text-sm font-medium">{title}</span>
      </header>
      <div className="relative h-[calc(100vh-3.5rem)] overflow-y-auto">
        <Link
          to={`/${orgSlug}/settings/integrations`}
          aria-label="Back to integrations"
          className="absolute top-[1.4370rem] left-14 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        {children}
      </div>
    </>
  );
}
