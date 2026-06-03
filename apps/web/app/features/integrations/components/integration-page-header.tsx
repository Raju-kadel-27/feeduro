import { SidebarTrigger } from "@components/ui/sidebar";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";

export function IntegrationPageHeader({ title }: { title: string }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Link
        to={`/${orgSlug}/settings/integrations`}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <span className="text-sm font-medium">{title}</span>
    </header>
  );
}
