import { SidebarTrigger } from "@components/ui/sidebar";

export function WebhooksHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center px-4">
      <SidebarTrigger className="-ml-1" />
    </header>
  );
}
