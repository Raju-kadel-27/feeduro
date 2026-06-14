import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog";
import { Plus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (v: string) => void;
  redirectUris: string;
  onRedirectUrisChange: (v: string) => void;
  isPublic: boolean;
  onIsPublicChange: (v: boolean) => void;
  creating: boolean;
  onSubmit: () => void;
}

export function CreateClientDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  redirectUris,
  onRedirectUrisChange,
  isPublic,
  onIsPublicChange,
  creating,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[15px] font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus size={16} />
          New App
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register OAuth App</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label htmlFor="oauth-name" className="text-sm text-muted-foreground">
              App name
            </label>
            <input
              id="oauth-name"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="My Integration"
              required
              maxLength={64}
              className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="oauth-redirect-uris" className="text-sm text-muted-foreground">
              Redirect URIs <span className="text-xs opacity-60">(one per line)</span>
            </label>
            <textarea
              id="oauth-redirect-uris"
              value={redirectUris}
              onChange={(e) => onRedirectUrisChange(e.target.value)}
              placeholder="https://myapp.com/callback"
              required
              rows={3}
              className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="oauth-is-public"
              checked={isPublic}
              onChange={(e) => onIsPublicChange(e.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="oauth-is-public" className="text-sm">
              Public client{" "}
              <span className="text-muted-foreground text-xs">(native / SPA — no client secret)</span>
            </label>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={creating || !name.trim() || !redirectUris.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {creating ? "Creating…" : "Create App"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
