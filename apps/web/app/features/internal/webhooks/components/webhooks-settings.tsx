import { PageHeader } from "@components/common/page-header";
import { Button } from "@components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useRevalidator } from "react-router";
import type { EndpointRow } from "../types";
import { CreateDialog } from "./create-dialog";
import { EndpointsList } from "./endpoints-list";
import { SignatureGuide } from "./signature-guide";

type Props = { loaderData: { endpoints: EndpointRow[]; isAdmin: boolean } };

export default function WebhooksSettings({ loaderData }: Props) {
  const { endpoints, isAdmin } = loaderData;
  const revalidator = useRevalidator();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
        <PageHeader
          title="Webhooks"
          description="Receive HTTP POST notifications when events happen in your workspace. Every delivery is signed so you can verify authenticity."
          action={
            isAdmin ? (
              <Button onClick={() => setCreateOpen(true)} size="sm">
                <Plus size={16} />
                Add Endpoint
              </Button>
            ) : undefined
          }
        />

        <EndpointsList
          endpoints={endpoints}
          isAdmin={isAdmin}
          onAddEndpoint={() => setCreateOpen(true)}
        />

        <SignatureGuide />
      </main>

      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => revalidator.revalidate()}
      />
    </>
  );
}
