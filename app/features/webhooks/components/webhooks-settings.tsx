import { useState } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { SidebarInset, SidebarProvider } from "@components/ui/sidebar";
import { AppSidebar } from "@features/layout/components/app-sidebar";
import { useMutation } from "@tanstack/react-query";
import { CreateDialog } from "./create-dialog";
import { RotatedSecretDialog } from "./rotated-secret-dialog";
import { WebhooksHeader } from "./webhooks-header";
import { WebhooksDescription } from "./webhooks-description";
import { EndpointsList } from "./endpoints-list";
import { SignatureGuide } from "./signature-guide";
// import type { Route } from "../../../routes/+types/webhooks";

async function callApi(body: object) {
  const res = await fetch("/api/webhooks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error((json.error as string) ?? "Request failed");
  return json;
}
// @ts-ignore
export default function WebhooksSettings({ loaderData }) {
  const { endpoints, isAdmin } = loaderData;
  const revalidator = useRevalidator();

  const [createOpen, setCreateOpen] = useState(false);
  const [rotatedSecret, setRotatedSecret] = useState<string | null>(null);

  const { mutate: deleteEndpoint, isPending: deleting } = useMutation({
    mutationFn: (id: string) => callApi({ intent: "delete", id }),
    onSuccess: () => {
      toast.success("Webhook endpoint deleted");
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      callApi({ intent: "update", id, isActive }),
    onSuccess: (_, { isActive }) => {
      toast.success(isActive ? "Webhook enabled" : "Webhook disabled");
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: rotateSecret, isPending: rotating } = useMutation({
    mutationFn: (id: string) => callApi({ intent: "rotate_secret", id }),
    onSuccess: (result) => {
      setRotatedSecret((result.secret as string) ?? null);
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <WebhooksHeader />

        <main className="p-8 max-w-[720px] mx-auto w-full space-y-10">
          <WebhooksDescription />

          <EndpointsList
            endpoints={endpoints}
            isAdmin={isAdmin}
            onToggle={(id, isActive) => toggleActive({ id, isActive })}
            onRotate={rotateSecret}
            onDelete={deleteEndpoint}
            onAddEndpoint={() => setCreateOpen(true)}
            rotating={rotating}
            deleting={deleting}
          />

          <SignatureGuide />
        </main>
      </SidebarInset>

      {/* Dialogs rendered outside main to avoid layout nesting issues */}
      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => revalidator.revalidate()}
      />

      {rotatedSecret && (
        <RotatedSecretDialog
          secret={rotatedSecret}
          onClose={() => setRotatedSecret(null)}
        />
      )}
    </SidebarProvider>
  );
}
