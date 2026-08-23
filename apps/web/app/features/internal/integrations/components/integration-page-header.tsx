import { SidebarTrigger } from "@components/ui/sidebar";
import { ArrowLeft } from "lucide-react";
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
          className="absolute top-[1.4370rem] left-14 flex items-center gap-1.5 text-sm font-medium text-muted-foreground/60 hover:text-foreground transition-colors duration-150"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        {children}
      </div>
    </>
  );
}
