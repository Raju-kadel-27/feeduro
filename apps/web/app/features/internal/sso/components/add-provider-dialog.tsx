import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog";
import { callSSOApi } from "@features/internal/sso/api";
import { CopyButton } from "@features/internal/sso/components/copy-button";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";

export function AddProviderDialog({ baseUrl }: { baseUrl: string }) {
  const revalidator = useRevalidator();
  const [providerId, setProviderId] = useState("");
  const [issuer, setIssuer] = useState("");
  const [domain, setDomain] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  const callbackUrl = providerId.trim()
    ? `${baseUrl}/api/auth/sso/callback/${providerId.trim()}`
    : `${baseUrl}/api/auth/sso/callback/{provider-id}`;

  const { mutate: registerProvider, isPending: registering } = useMutation({
    mutationFn: () =>
      callSSOApi({ intent: "register", providerId, issuer, domain, clientId, clientSecret }),
    onSuccess: () => {
      toast.success("SSO provider configured");
      setProviderId("");
      setIssuer("");
      setDomain("");
      setClientId("");
      setClientSecret("");
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[15px] font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus size={16} />
          Add Provider
        </button>
      </DialogTrigger>
      <DialogContent>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(148 163 184 / 0.02)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e\")",
          }}
        />
        <DialogHeader>
          <DialogTitle>Configure OIDC Provider</DialogTitle>
        </DialogHeader>
        <div className="mb-4 rounded-lg border border-border bg-muted/20 px-4 py-3">
          <p className="text-sm text-muted-foreground mb-2">
            Register this redirect URI with your identity provider:
          </p>
          <div className="flex items-center gap-3">
            <code className="text-sm text-foreground font-mono break-all flex-1">{callbackUrl}</code>
            <CopyButton value={callbackUrl} />
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); registerProvider(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Provider ID</label>
              <input
                type="text"
                value={providerId}
                onChange={(e) => setProviderId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                placeholder="e.g. acme-corp"
                required
                className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">Unique slug, used in the callback URL</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Domain</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. yourcompany.com"
                required
                className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">Users with this email domain</p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Issuer URL</label>
            <input
              type="url"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="https://your-org.okta.com"
              required
              className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              OIDC discovery fetched from{" "}
              <span className="font-mono">{"{issuer}/.well-known/openid-configuration"}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Client ID from your IdP"
                required
                className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Client Secret</label>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Client secret from your IdP"
                required
                className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={registering || !providerId || !issuer || !domain || !clientId || !clientSecret}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {registering ? "Saving…" : "Save Provider"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
