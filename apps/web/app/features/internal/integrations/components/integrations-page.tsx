import { SidebarTrigger } from "@components/ui/sidebar";
import type { IntegrationsLoaderData } from "../server/loader";
import { AutomationIntegrations } from "./automation-integrations";
import { CrmIntegrations } from "./crm-integrations";
import { CustomerSupportIntegrations } from "./customer-support-integrations";
import { IntegrationsPageHeader } from "./page-header";
import { ProjectManagementIntegrations } from "./project-management-integrations";
import { SocialLoginIntegrations } from "./social-logins-integrations";

export default function IntegrationsSettings({ loaderData }: { loaderData: IntegrationsLoaderData }) {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <main className="p-6 max-w-[840px] mx-auto w-full space-y-6">
        <IntegrationsPageHeader />
        <ProjectManagementIntegrations loaderData={loaderData} />
        <CrmIntegrations loaderData={loaderData} />
        <CustomerSupportIntegrations loaderData={loaderData} />
        <AutomationIntegrations loaderData={loaderData} />
        <SocialLoginIntegrations loaderData={loaderData} />
      </main>
    </>
  );
}
