import { useLoaderData } from "react-router";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/app/components/ui/sidebar";
import { AutomationIntegrations } from "./automation-integrations";
import { CrmIntegrations } from "./crm-integrations";
import { CustomerSupportIntegrations } from "./customer-support-integrations";
import { IntegrationsPageHeader } from "./page-header";
import { ProjectManagementIntegrations } from "./project-management-integrations";
import { SocialLoginIntegrations } from "./social-logins-integrations";
import { AppSidebar } from "@features/layout/components/app-sidebar";
import type { IntegrationsLoaderData } from "../server/loader";

export default function IntegrationsSettings() {
  const loaderData = useLoaderData() as IntegrationsLoaderData;
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium">Integrations</span>
        </header>
        <main className="p-6 max-w-[640px] mx-auto w-full space-y-6">
          <IntegrationsPageHeader />
          <ProjectManagementIntegrations loaderData={loaderData} />
          <CrmIntegrations loaderData={loaderData} />
          <CustomerSupportIntegrations loaderData={loaderData} />
          <AutomationIntegrations loaderData={loaderData} />
          <SocialLoginIntegrations loaderData={loaderData} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
