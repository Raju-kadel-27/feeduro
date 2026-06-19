import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import type { OAuthClientFormData } from "@features/oauth-clients/schemas/oauth-client";
import { useState } from "react";

interface Props {
  mode: "create" | "edit";
  initialData?: Partial<OAuthClientFormData>;
  submitting: boolean;
  onSubmit: (data: OAuthClientFormData) => void;
  onCancel: () => void;
}

export function OAuthClientForm({ mode, initialData, submitting, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [developerName, setDeveloperName] = useState(initialData?.developerName ?? "");
  const [developerUrl, setDeveloperUrl] = useState(initialData?.developerUrl ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [redirectUris, setRedirectUris] = useState(initialData?.redirectUris ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): OAuthClientFormData | null {
    const next: Record<string, string> = {};

    if (!name.trim()) next.name = "App name is required";
    else if (name.trim().length > 64) next.name = "Max 64 characters";

    if (developerName.length > 128) next.developerName = "Max 128 characters";

    if (developerUrl && !/^https?:\/\//i.test(developerUrl))
      next.developerUrl = "Must start with http:// or https://";

    if (description.length > 512) next.description = "Max 512 characters";

    const uriLines = redirectUris
      .split(/\n/)
      .map((u) => u.trim())
      .filter(Boolean);
    if (uriLines.length === 0) next.redirectUris = "At least one redirect URI is required";

    setErrors(next);
    if (Object.keys(next).length > 0) return null;

    return { name: name.trim(), developerName, developerUrl, description, redirectUris };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = validate();
    if (data) onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Application Name */}
      <div className="space-y-2">
        <label htmlFor="oauth-name" className="text-sm font-medium text-foreground">
          Application Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="oauth-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Integration"
          maxLength={64}
          className="h-10 text-sm"
        />
        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
      </div>

      {/* Developer Name */}
      <div className="space-y-2">
        <label htmlFor="oauth-dev-name" className="text-sm font-medium text-foreground">
          Developer Name
        </label>
        <Input
          id="oauth-dev-name"
          value={developerName}
          onChange={(e) => setDeveloperName(e.target.value)}
          placeholder="Acme Inc."
          maxLength={128}
          className="h-10 text-sm"
        />
        {errors.developerName && (
          <p className="text-xs text-destructive mt-1">{errors.developerName}</p>
        )}
      </div>

      {/* Developer URL */}
      <div className="space-y-2">
        <label htmlFor="oauth-dev-url" className="text-sm font-medium text-foreground">
          Developer URL
        </label>
        <Input
          id="oauth-dev-url"
          value={developerUrl}
          onChange={(e) => setDeveloperUrl(e.target.value)}
          placeholder="https://acme.com"
          className="h-10 text-sm font-mono"
        />
        {errors.developerUrl && (
          <p className="text-xs text-destructive mt-1">{errors.developerUrl}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="oauth-description" className="text-sm font-medium text-foreground">
            Description
          </label>
          <span className="text-xs text-muted-foreground/50">{description.length}/512</span>
        </div>
        <textarea
          id="oauth-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what your application does…"
          maxLength={512}
          rows={3}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50 transition-colors"
        />
        {errors.description && (
          <p className="text-xs text-destructive mt-1">{errors.description}</p>
        )}
      </div>

      {/* Redirect URIs */}
      <div className="space-y-2">
        <label htmlFor="oauth-redirect-uris" className="text-sm font-medium text-foreground">
          Redirect URIs <span className="text-destructive">*</span>
        </label>
        <p className="text-xs text-muted-foreground/70 -mt-1">
          Enter one URL per line. All listed URIs will be allowed during authorization.
        </p>
        <textarea
          id="oauth-redirect-uris"
          value={redirectUris}
          onChange={(e) => setRedirectUris(e.target.value)}
          placeholder={"https://myapp.com/callback\nhttps://localhost:3000/callback"}
          rows={4}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50 transition-colors"
        />
        {errors.redirectUris && (
          <p className="text-xs text-destructive mt-1">{errors.redirectUris}</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={submitting || !name.trim()}>
          {submitting
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create application"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
