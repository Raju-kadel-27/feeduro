import { PageHeader } from "@components/common/page-header";
import { Button } from "@components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog";
import { cn } from "@lib/utils";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, KeyRound, Link2, RefreshCw, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useRevalidator } from "react-router";
import { toast } from "sonner";
import type { EndpointRow } from "../types";
import { EndpointEvents } from "./endpoint-events";
import { RotatedSecretDialog } from "./rotated-secret-dialog";
import { SecretRevealRow } from "./secret-reveal-row";
import { CopyButton } from "./shared";

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

function SectionLabel({ icon: Icon, label, className }: {
  icon: React.ElementType;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 mb-4", className)}>
      <Icon size={14} className="text-muted-foreground shrink-0" />
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}

interface EndpointDetailProps {
  endpoint: EndpointRow;
  isAdmin: boolean;
}

export function EndpointDetail({ endpoint, isAdmin }: EndpointDetailProps) {
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState<"rotate" | "delete" | null>(null);
  const [rotatedSecret, setRotatedSecret] = useState<string | null>(null);

  const events: string[] = JSON.parse(endpoint.events) as string[];
  const displayName = endpoint.name ?? new URL(endpoint.url).hostname;

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
      setConfirming(null);
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: deleteEndpoint, isPending: deleting } = useMutation({
    mutationFn: (id: string) => callApi({ intent: "delete", id }),
    onSuccess: () => {
      toast.success("Webhook endpoint deleted");
      navigate("..", { relative: "path" });
    },
    onError: (err) => toast.error(err.message),
  });

  function handleConfirm() {
    if (confirming === "rotate") rotateSecret(endpoint.id);
    else if (confirming === "delete") deleteEndpoint(endpoint.id);
  }

  const statusBadge = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        endpoint.isActive
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          endpoint.isActive ? "bg-emerald-500" : "bg-muted-foreground/40",
        )}
      />
      {endpoint.isActive ? "Active" : "Inactive"}
    </span>
  );

  return (
    <main className="p-6 max-w-[840px] mx-auto w-full">
      <div className="relative">

        {/* Sticky back button — floats left, doesn't shift the card */}
        <div className="hidden lg:block absolute -left-16 top-0 pt-1">
          <div className="sticky top-[76px]">
            <Link
              to=".."
              relative="path"
              aria-label="Back"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">

            {/* Header */}
            <div className="px-6 pt-5 pb-6 border-b border-border">
              <PageHeader
                title={displayName}
                description="Manage this endpoint's connection, subscribed events, and signing credentials."
                action={statusBadge}
              />
            </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-8">

          {/* Connection */}
          <div>
            <SectionLabel icon={Link2} label="Connection" />
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/10 px-3 py-2">
                <code className="text-xs font-mono text-foreground flex-1 break-all">
                  {endpoint.url}
                </code>
                <CopyButton value={endpoint.url} />
              </div>

              {isAdmin && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Active</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {endpoint.isActive ? "Receiving deliveries" : "Paused — no deliveries sent"}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={endpoint.isActive}
                    aria-label={endpoint.isActive ? "Disable webhook" : "Enable webhook"}
                    onClick={() => toggleActive({ id: endpoint.id, isActive: !endpoint.isActive })}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      endpoint.isActive ? "bg-primary" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform",
                        endpoint.isActive ? "translate-x-4" : "translate-x-0",
                      )}
                    />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Events */}
          <div>
            <SectionLabel icon={Zap} label="Events" />
            <EndpointEvents events={events} createdAt={endpoint.createdAt} />
          </div>

          {/* Signing secret */}
          {isAdmin && (
            <div>
              <SectionLabel icon={KeyRound} label="Signing Secret" />
              <SecretRevealRow endpointId={endpoint.id} />
            </div>
          )}

          {/* Danger zone */}
          {isAdmin && (
            <div className="pt-6 border-t border-destructive/20">
              <SectionLabel
                icon={AlertTriangle}
                label="Danger Zone"
                className="[&>svg]:text-destructive/60 [&>p]:text-destructive/60"
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-800 dark:hover:bg-amber-950"
                  disabled={rotating}
                  onClick={() => setConfirming("rotate")}
                >
                  <RefreshCw size={14} />
                  Rotate signing secret
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                  disabled={deleting}
                  onClick={() => setConfirming("delete")}
                >
                  <Trash2 size={14} />
                  Delete endpoint
                </Button>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      <Dialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={confirming === "rotate" ? "text-amber-600" : "text-destructive"}>
              {confirming === "rotate" ? "Rotate signing secret?" : "Delete this endpoint?"}
            </DialogTitle>
            <DialogDescription>
              {confirming === "rotate"
                ? "Your current secret will stop working immediately. Update your consumer before continuing."
                : "All deliveries will stop immediately and the endpoint cannot be recovered."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="px-4 py-2 rounded-md border border-border bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={rotating || deleting}
              className={
                confirming === "rotate"
                  ? "px-4 py-2 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
                  : "px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
              }
            >
              {confirming === "rotate" ? "Yes, rotate" : "Yes, delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {rotatedSecret && (
        <RotatedSecretDialog secret={rotatedSecret} onClose={() => setRotatedSecret(null)} />
      )}
    </main>
  );
}
