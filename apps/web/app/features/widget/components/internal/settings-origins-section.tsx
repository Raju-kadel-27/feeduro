import { Check } from "lucide-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { SectionHeading } from "./section-heading";

type Props = { initialAllowedOrigins: string | null };

function toTextarea(stored: string | null): string {
  if (!stored) return "";
  return stored.split(",").join("\n");
}

export function SettingsOriginsSection({ initialAllowedOrigins }: Props) {
  const fetcher = useFetcher<{ ok: boolean }>();
  const [value, setValue] = useState(() => toTextarea(initialAllowedOrigins));

  const isSaving = fetcher.state !== "idle";
  const savedOk = fetcher.data?.ok;

  function handleSave() {
    const form = new FormData();
    form.set("intent", "save-origins");
    form.set("allowedOrigins", value);
    fetcher.submit(form, { method: "POST" });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <SectionHeading
        title="Allowed origins"
        description="Domains that are allowed to embed this widget. Leave empty to allow any site. One origin per line — e.g. https://yourapp.com"
      />
      <p className="text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
        Enforcement is not yet active — origins are saved but not checked at request time.
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={"https://yourapp.com\nhttps://app.yourapp.com"}
        rows={3}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-ring resize-none transition"
      />
      <div className="flex items-center gap-2">
        {!isSaving && savedOk && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-3 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </section>
  );
}
