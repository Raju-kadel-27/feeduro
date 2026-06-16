import { PageHeader } from "@components/common/page-header";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/ui/tooltip";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { authClient } from "@lib/auth/client";
import { Fingerprint, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SidebarTrigger } from "@/app/components/ui/sidebar";

import type { Route } from "./+types/passkeys";

export function meta() {
  return [{ title: "Passkeys — Feeduro" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireOrgBySlug(request, params.orgSlug);
  return null;
}

interface PasskeyRecord {
  id: string;
  name: string | null;
  createdAt: Date | string | null;
}

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(d));
}

export default function PasskeysSettings() {
  const [passkeys, setPasskeys] = useState<PasskeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadPasskeys() {
    setLoading(true);
    const { data, error } = await authClient.passkey.listUserPasskeys();
    if (error) {
      toast.error(error.message ?? "Failed to load passkeys");
    } else {
      setPasskeys((data as PasskeyRecord[] | null) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadPasskeys();
  }, []);

  async function handleAdd() {
    setAdding(true);
    const { error } = await authClient.passkey.addPasskey({ name: "My Passkey" });
    if (error) {
      toast.error(error.message ?? "Failed to register passkey");
    } else {
      toast.success("Passkey registered");
      await loadPasskeys();
    }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const { error } = await authClient.passkey.deletePasskey({ id });
    if (error) {
      toast.error(error.message ?? "Failed to delete passkey");
    } else {
      toast.success("Passkey removed");
      setPasskeys((prev) => prev.filter((pk) => pk.id !== id));
    }
    setDeletingId(null);
  }

  return (
        <>
        <header className="flex h-14 shrink-0 items-center px-4">
          <SidebarTrigger className="-ml-1" />
        </header>

        <main className="p-6 max-w-[840px] mx-auto w-full">
          <PageHeader
            title="Passkeys"
            action={
              <button
                type="button"
                onClick={handleAdd}
                disabled={adding}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[15px] font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Plus size={16} />
                {adding ? "Registering…" : "Add Passkey"}
              </button>
            }
          />

          <section className="space-y-6">
            {loading ? (
              <div className="rounded-lg border border-border p-10 text-center bg-muted/10">
                <p className="text-sm text-muted-foreground">Loading…</p>
              </div>
            ) : passkeys.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-10 text-center bg-muted/10">
                <Fingerprint size={24} className="mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No passkeys registered yet.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden bg-card">
                <div className="grid grid-cols-[1fr_auto_auto] items-center px-4 h-12 bg-muted/20 border-b border-border gap-4">
                  <div className="text-sm text-muted-foreground">Name</div>
                  <div className="text-sm text-muted-foreground">Added</div>
                  <div className="w-8" />
                </div>
                <ul>
                  {passkeys.map((pk, i) => (
                    <li
                      key={pk.id}
                      className={`grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 gap-4${i !== 0 ? " border-t border-border" : ""}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Fingerprint size={16} className="text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {pk.name ?? "Passkey"}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                        {pk.createdAt ? formatDate(pk.createdAt) : "—"}
                      </div>
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => handleDelete(pk.id)}
                              disabled={deletingId === pk.id}
                              className="p-2 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground disabled:opacity-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Remove passkey</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </section>

          <section className="rounded-lg border border-border bg-muted/10 px-6 py-4 space-y-2">
            <p className="text-sm font-medium text-foreground">What are passkeys?</p>
            <p className="text-sm text-muted-foreground">
              Passkeys use your device's biometrics (Face ID, fingerprint) or PIN to authenticate
              you — no password required. They are phishing-resistant and unique to each website.
            </p>
          </section>
        </main>
        </>
  );
}
