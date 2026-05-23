import { AppSidebar } from "@features/layout/components/app-sidebar/app-sidebar";
import { useLoaderData } from "react-router";
import { PageTitle } from "@/app/components/common/page-title";
import { SidebarInset, SidebarProvider } from "@/app/components/ui/sidebar";
import type { IntegrationsLoaderData } from "../server/loader";
import { AutomationIntegrations } from "./automation-integrations";
import { CrmIntegrations } from "./crm-integrations";
import { CustomerSupportIntegrations } from "./customer-support-integrations";
import { IntegrationsPageHeader } from "./page-header";
import { ProjectManagementIntegrations } from "./project-management-integrations";
import { SocialLoginIntegrations } from "./social-logins-integrations";

export default function IntegrationsSettings() {
  const loaderData = useLoaderData() as IntegrationsLoaderData;
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageTitle title="Integrations" />
        <main className="p-6 max-w-[840px] mx-auto w-full space-y-6">
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
