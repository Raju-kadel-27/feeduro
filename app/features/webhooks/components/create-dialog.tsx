import { AlertCircle, Copy } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@components/ui/dialog";
import { cn } from "@lib/utils";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { SUPPORTED_EVENTS } from "../constants";
import { CopyButton } from "./shared";

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

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

export function CreateDialog({ open, onOpenChange, onCreated }: CreateDialogProps) {
  const [step, setStep] = useState<"form" | "secret">("form");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["*"]);
  const [secret, setSecret] = useState("");

  function toggleEvent(value: string) {
    if (value === "*") {
      setSelectedEvents(["*"]);
      return;
    }
    const without = selectedEvents.filter((e) => e !== "*");
    if (without.includes(value)) {
      const next = without.filter((e) => e !== value);
      setSelectedEvents(next.length === 0 ? ["*"] : next);
    } else {
      setSelectedEvents([...without, value]);
    }
  }

  function reset() {
    setStep("form");
    setName("");
    setUrl("");
    setSelectedEvents(["*"]);
    setSecret("");
  }

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: () =>
      callApi({ intent: "create", name: name.trim() || undefined, url, events: selectedEvents }),
    onSuccess: (result) => {
      const s = (result.endpoint as { secret?: string })?.secret ?? "";
      setSecret(s);
      setStep("secret");
      onCreated();
    },
    onError: (err) => toast.error(err.message),
  });

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>New Webhook Endpoint</DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                create();
              }}
              className="space-y-5 mt-2"
            >
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Display name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Slack alerts, Zapier, Production backend"
                  maxLength={100}
                  className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* URL */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Endpoint URL <span className="text-destructive">*</span>
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/webhooks/feediyo"
                  required
                  className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                />
                <p className="text-xs text-muted-foreground">Must be an HTTPS URL.</p>
              </div>

              {/* Events */}
              <div className="space-y-3">
                <label className="text-sm text-muted-foreground">Events to send</label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes("*")}
                    onChange={() => toggleEvent("*")}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm font-medium text-foreground">All events</span>
                </label>

                <div
                  className={cn(
                    "pl-4 space-y-2 border-l-2 border-border",
                    selectedEvents.includes("*") && "opacity-40 pointer-events-none",
                  )}
                >
                  {SUPPORTED_EVENTS.map((ev) => (
                    <label key={ev.value} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes("*") || selectedEvents.includes(ev.value)}
                        onChange={() => toggleEvent(ev.value)}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      <span className="text-sm text-foreground">{ev.label}</span>
                      <code className="text-xs text-muted-foreground font-mono">{ev.value}</code>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={creating || !url.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {creating ? "Creating…" : "Create Endpoint"}
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  className="px-4 py-2 rounded-md border border-border bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Save your signing secret</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-3 text-amber-600">
                <AlertCircle size={16} className="shrink-0" />
                <p className="text-sm font-medium">
                  This secret is shown only once. Copy it now — you won't be able to retrieve it
                  again.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/10 px-4 py-3">
                <code className="text-sm font-mono text-foreground flex-1 break-all">{secret}</code>
                <CopyButton value={secret} />
              </div>

              <p className="text-xs text-muted-foreground">
                Use this to verify the{" "}
                <code className="font-mono text-foreground">X-Webhook-Signature</code> header on
                incoming requests.
              </p>

              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                Done, I've saved my secret
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}