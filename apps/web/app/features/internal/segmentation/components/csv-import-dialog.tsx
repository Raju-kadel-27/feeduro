import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@components/ui/dialog";
import { CsvRowSchema, csvRowToIdentifyInput } from "@features/internal/segmentation/schemas/csv";
import type { IdentifyUserInput } from "@features/internal/segmentation/schemas/identify";
import Papa from "papaparse";
import { useState } from "react";
import { toast } from "sonner";
import { CsvDropZone } from "./csv-drop-zone";

interface ParseResult {
  valid: IdentifyUserInput[];
  errors: Array<{ row: number; message: string }>;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}

export function CsvImportDialog({ open, onOpenChange, onSuccess }: Props) {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState(false);

  function reset() {
    setResult(null);
  }

  function handleFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(res) {
        const valid: IdentifyUserInput[] = [];
        const errors: Array<{ row: number; message: string }> = [];
        for (const [i, raw] of res.data.entries()) {
          const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== ""));
          const parsed = CsvRowSchema.safeParse(cleaned);
          if (parsed.success) {
            valid.push(csvRowToIdentifyInput(parsed.data));
          } else {
            errors.push({ row: i + 2, message: parsed.error.errors?.[0]?.message ?? "Invalid row" });
          }
        }
        setResult({ valid, errors });
      },
    });
  }

  async function handleImport() {
    if (!result?.valid.length) return;
    setImporting(true);
    try {
      const res = await fetch("/api/user-profiles-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profiles: result.valid }),
      });
      const json = (await res.json()) as { imported?: number; updated?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Import failed");
      toast.success(`${json.imported} added, ${json.updated} updated`);
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const btnBase = "inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-md transition-colors";

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import contacts from CSV</DialogTitle>
        </DialogHeader>

        {!result ? (
          <CsvDropZone onFile={handleFile} />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">{result.valid.length} valid rows</span>
              {result.errors.length > 0 && (
                <span className="text-destructive">{result.errors.length} with errors (skipped)</span>
              )}
            </div>
            {result.errors.length > 0 && (
              <ul className="text-xs text-destructive space-y-0.5 bg-destructive/5 rounded-md p-3 max-h-32 overflow-y-auto">
                {result.errors.slice(0, 10).map((e) => (
                  <li key={e.row}>Row {e.row}: {e.message}</li>
                ))}
                {result.errors.length > 10 && <li>…and {result.errors.length - 10} more</li>}
              </ul>
            )}
            <button type="button" onClick={reset} className="text-xs text-muted-foreground hover:text-foreground underline">
              Choose a different file
            </button>
          </div>
        )}

        <DialogFooter>
          <button type="button" onClick={() => { onOpenChange(false); reset(); }} className={`${btnBase} border border-border hover:bg-accent`}>
            Cancel
          </button>
          <button type="button" disabled={!result?.valid.length || importing} onClick={handleImport} className={`${btnBase} bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40`}>
            {importing ? "Importing…" : `Import ${result?.valid.length ?? 0} contacts`}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
