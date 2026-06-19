import { PageHeader } from "@components/common/page-header";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import type { EndpointRow } from "../types";
import { CreateDialog } from "./create-dialog";
import { EndpointsList } from "./endpoints-list";
import { RotatedSecretDialog } from "./rotated-secret-dialog";
import { SignatureGuide } from "./signature-guide";

type Props = { loaderData: { endpoints: EndpointRow[]; isAdmin: boolean } };

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
export default function WebhooksSettings({ loaderData }: Props) {
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
    <>
      <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
        <PageHeader
          title="Webhooks"
          description="Receive HTTP POST notifications when events happen in your workspace. Every delivery is signed so you can verify authenticity."
        />

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

      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => revalidator.revalidate()}
      />

      {rotatedSecret && (
        <RotatedSecretDialog secret={rotatedSecret} onClose={() => setRotatedSecret(null)} />
      )}
    </>
  );
}
