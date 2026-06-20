import { PageHeader } from "@components/common/page-header";
import { Puzzle } from "lucide-react";

export function IntegrationsPageHeader() {
  return (
    <PageHeader
      title="Integrations"
      icon={Puzzle}
      description="Connect with your favorite tools and services."
    />
  );
}
