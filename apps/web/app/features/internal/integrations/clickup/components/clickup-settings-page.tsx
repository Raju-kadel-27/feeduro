import { Spinner } from "@components/ui/spinner";
import { IntegrationPageHeader } from "@features/internal/integrations/components/integration-page-header";
import { cn } from "@lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { ClickupConnectSection } from "./clickup-connect-section";
import { ClickupStatusMappings } from "./clickup-status-mappings";
import { ListPicker } from "./list-picker";

interface IntegrationState {
  connected: boolean;
  workspaceId: string | null;
  workspaceName: string | null;
  defaultSpaceId: string | null;
  defaultListId: string | null;
  defaultListName: string | null;
  autoCreateTasks: boolean;
  statusMappings: Array<{ clickupStatus: string; feeduroStatus: string }>;
  webhookConfigured: boolean;
}

interface Props { integration: IntegrationState | null; isAdmin: boolean }

async function callClickupApi(body: object) {
  const res = await fetch("/api/oauth2/integrations/clickup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json()) as { error?: string; [k: string]: unknown };
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

export function ClickupSettingsPage({ integration, isAdmin }: Props) {
  const revalidator = useRevalidator();
  const connected = !!integration?.connected;

  const workspacesQuery = useQuery({
    queryKey: ["clickup-workspaces"],
    queryFn: async () => {
      const json = (await callClickupApi({ intent: "list_workspaces" })) as { workspaces?: { id: string; name: string }[] };
      return json.workspaces ?? [];
    },
    enabled: connected && !integration?.workspaceId,
  });

  const workspaceId = integration?.workspaceId ?? workspacesQuery.data?.[0]?.id ?? null;
  const workspaceName = integration?.workspaceName ?? workspacesQuery.data?.[0]?.name ?? null;

  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(integration?.defaultSpaceId ?? null);
  const [selectedListId, setSelectedListId] = useState<string | null>(integration?.defaultListId ?? null);
  const [selectedListName, setSelectedListName] = useState<string | null>(integration?.defaultListName ?? null);
  const [autoCreate, setAutoCreate] = useState(integration?.autoCreateTasks ?? false);
  const [statusMappings, setStatusMappings] = useState(integration?.statusMappings ?? []);
  const [dirty, setDirty] = useState(false);

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => callClickupApi({ intent: "update_settings", workspaceId, workspaceName, defaultSpaceId: selectedSpaceId, defaultListId: selectedListId, defaultListName: selectedListName, autoCreateTasks: autoCreate, statusMappings }),
    onSuccess: () => { toast.success("ClickUp settings saved"); setDirty(false); revalidator.revalidate(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <>
      <IntegrationPageHeader title="ClickUp Integration" />
      <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
        <div>
          <h2 className="text-sm font-semibold text-foreground">ClickUp</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create ClickUp tasks from feedback. Task status changes sync back automatically.
          </p>
        </div>

        <ClickupConnectSection connected={connected} workspaceName={workspaceName} isAdmin={isAdmin} onCallApi={callClickupApi} />

        <section className={cn("space-y-3", !connected && "opacity-40 pointer-events-none")}>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">2</span>
            <h3 className="text-sm font-semibold text-foreground">Configure</h3>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">Default list</p>
              <p className="text-sm text-muted-foreground">Tasks will be created in this list unless overridden per-card.</p>
              {selectedListName && (
                <div className="flex items-center gap-1.5 text-sm text-foreground">
                  <Check size={11} className="text-green-600 shrink-0" />
                  <span className="font-medium">{selectedListName}</span>
                </div>
              )}
              {workspaceId && isAdmin && (
                <ListPicker
                  workspaceId={workspaceId}
                  selectedListId={selectedListId}
                  initialSpaceId={selectedSpaceId}
                  onSelect={(listId, listName, spaceId) => { setSelectedSpaceId(spaceId); setSelectedListId(listId); setSelectedListName(listName); setDirty(true); }}
                />
              )}
              {!isAdmin && integration?.defaultListName && (
                <p className="text-sm text-foreground">{integration.defaultListName}</p>
              )}
            </div>

            {selectedListId && (
              <ClickupStatusMappings
                listId={selectedListId}
                savedMappings={statusMappings}
                onChange={(m) => { setStatusMappings(m); setDirty(true); }}
                disabled={!isAdmin}
              />
            )}

            <div className="flex items-center justify-between gap-4 pt-1 border-t border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Auto-create tasks</p>
                <p className="text-sm text-muted-foreground mt-0.5">Automatically create a ClickUp task when new feedback is submitted.</p>
              </div>
              <button type="button" role="switch" aria-checked={autoCreate} disabled={!isAdmin}
                onClick={() => { setAutoCreate((v) => !v); setDirty(true); }}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                  autoCreate ? "bg-primary" : "bg-input",
                )}>
                <span className={cn("pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform", autoCreate ? "translate-x-4" : "translate-x-0")} />
              </button>
            </div>

            {isAdmin && dirty && (
              <div className="pt-1">
                <button type="button" disabled={saving} onClick={() => save()}
                  className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {saving ? <Spinner className="size-3" /> : <Check size={12} />} Save settings
                </button>
              </div>
            )}
          </div>
        </section>

        {connected && integration?.webhookConfigured && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
            Webhook active — ClickUp task status changes sync back to Feeduro automatically.
          </p>
        )}
      </main>
    </>
  );
}
