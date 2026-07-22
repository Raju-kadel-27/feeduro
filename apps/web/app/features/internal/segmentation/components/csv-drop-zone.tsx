import { Download, Upload } from "lucide-react";
import { useRef } from "react";

const COLUMNS = [
  { name: "email",           required: true,  desc: "Email address — the unique identifier for each user" },
  { name: "externalId",      required: false, desc: "Your internal user or customer ID" },
  { name: "name",            required: false, desc: "Display name" },
  { name: "plan",            required: false, desc: "Plan name — resolves MRR from your plan catalog" },
  { name: "billingInterval", required: false, desc: "'monthly' or 'annual' — picks the right plan price" },
  { name: "mrr",             required: false, desc: "Explicit $/mo override — takes priority over plan price" },
  { name: "role",            required: false, desc: "Job role (e.g. founder, developer)" },
  { name: "companySize",     required: false, desc: "Employee count, whole number" },
  { name: "industry",        required: false, desc: "Industry (e.g. SaaS, Fintech)" },
  { name: "location",        required: false, desc: "Region or country (e.g. North America)" },
  { name: "companyId",       required: false, desc: "Groups users into a shared company account" },
  { name: "companyName",     required: false, desc: "Company display name" },
  { name: "companyMrr",      required: false, desc: "Company MRR ($) — counted once per company per post" },
] as const;

const SAMPLE_CSV = [
  "email,externalId,name,plan,billingInterval,mrr,role,companySize,industry,location,companyId,companyName,companyMrr",
  "alice@bigco.com,cus_001,Alice Johnson,starter,annual,,founder,120,SaaS,North America,bigco,BigCo,500",
  "bob@bigco.com,,Bob Smith,starter,monthly,,developer,120,SaaS,North America,bigco,BigCo,500",
  "dana@example.com,,Dana Lee,pro,,80,designer,,SaaS,Europe,,,",
].join("\n");

function downloadSample() {
  const url = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "feeduro-contacts-sample.csv" });
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  onFile: (file: File) => void;
}

export function CsvDropZone({ onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-5">
      {/* Upload area */}
      <div
        role="button"
        tabIndex={0}
        className="border-2 border-dashed border-border rounded-xl p-8 cursor-pointer text-center hover:border-primary/40 hover:bg-muted/20 transition-colors"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      >
        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-base font-semibold mb-1">Drop a CSV file or click to browse</p>
        <p className="text-sm text-muted-foreground mb-5">
          Column order doesn't matter — headers are matched by name.
        </p>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); downloadSample(); }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-accent transition-colors"
        >
          <Download className="h-4 w-4" /> Download sample CSV
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
      </div>

      {/* Column reference */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2.5">
          Supported columns
        </p>
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
          {COLUMNS.map((col) => (
            <div key={col.name} className="flex items-start gap-4 px-4 py-3 bg-background">
              <div className="flex items-center gap-2 shrink-0 w-44">
                <code className="text-sm font-mono font-medium text-foreground">{col.name}</code>
                {col.required && (
                  <span className="text-[11px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded shrink-0">
                    required
                  </span>
                )}
              </div>
              <span className="text-sm text-muted-foreground leading-snug">{col.desc}</span>
            </div>
          ))}
          <div className="flex items-start gap-4 px-4 py-3 bg-muted/30">
            <div className="shrink-0 w-44">
              <code className="text-sm font-mono text-muted-foreground">any other column</code>
            </div>
            <span className="text-sm text-muted-foreground">Saved as a custom attribute</span>
          </div>
        </div>
      </div>
    </div>
  );
}
