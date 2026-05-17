import { SidebarTrigger } from "@components/ui/sidebar";

export function WebhooksHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b px-6 bg-muted/10">
      <SidebarTrigger className="-ml-1" />
      <span className="text-lg font-semibold">Webhooks</span>
    </header>
  );
}