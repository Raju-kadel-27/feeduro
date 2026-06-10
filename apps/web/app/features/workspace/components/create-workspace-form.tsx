import { Spinner } from "@components/ui/spinner";
import { useCreateWorkspace } from "@features/workspace/hooks/use-create-workspace";
import { cn } from "@lib/utils";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef } from "react";

interface CreateWorkspaceFormProps {
  /** Compact layout for inline use (e.g. dropdown). Full layout for standalone pages. */
  compact?: boolean;
  /** Show a back button — useful in compact/inline contexts. */
  onBack?: () => void;
  autoFocus?: boolean;
}

export function CreateWorkspaceForm({
  compact = false,
  onBack,
  autoFocus = false,
}: CreateWorkspaceFormProps) {
  const { name, slug, error, loading, canSubmit, handleNameChange, handleSlugChange, submit } =
    useCreateWorkspace();

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) nameRef.current?.focus();
  }, [autoFocus]);

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="text-xs font-semibold">New workspace</span>
        </div>

        <form onSubmit={submit} className="p-3 space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Inc."
              className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">URL slug</label>
            <div className="flex items-center rounded-md border bg-background px-2.5 focus-within:ring-2 focus-within:ring-primary">
              <span className="text-xs text-muted-foreground shrink-0">feeduro.com/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="acme"
                className="flex-1 py-1.5 text-sm bg-transparent focus:outline-none min-w-0"
              />
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50",
            )}
          >
            {loading && <Spinner className="size-3.5" />}
            {loading ? "Creating…" : "Create workspace"}
          </button>
        </form>
      </>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Workspace name</label>
        <input
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Acme Inc."
          required
          className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Workspace URL</label>
        <div className="flex items-center gap-1 rounded-md border bg-background px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-primary">
          <span className="text-muted-foreground select-none">feeduro.com/</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="acme-inc"
            required
            className="flex-1 bg-transparent focus:outline-none min-w-0"
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
      )}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {loading ? "Creating workspace…" : "Create workspace"}
      </button>
    </form>
  );
}
