import { Download, Upload } from "lucide-react";
import { useRef } from "react";

const COLUMNS = [
  { name: "email",       required: true,  desc: "Email address (identifier)" },
  { name: "externalId",  required: false, desc: "Your internal user / customer ID" },
  { name: "name",        required: false, desc: "Display name" },
  { name: "plan",        required: false, desc: "Subscription plan (e.g. free, paying)" },
  { name: "role",        required: false, desc: "Job role (e.g. founder, developer)" },
  { name: "companySize", required: false, desc: "Employee count — whole number" },
  { name: "industry",    required: false, desc: "Industry (e.g. SaaS, Fintech)" },
  { name: "location",    required: false, desc: "Region or country (e.g. North America)" },
] as const;

const SAMPLE_CSV = [
  "email,externalId,name,plan,role,companySize,industry,location",
  "alice@example.com,cus_001,Alice Johnson,paying,founder,12,SaaS,North America",
  "bob@example.com,,Bob Smith,trial,developer,,Fintech,Europe",
  "carol@example.com,,,free,,,,",
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
    <div
      className="border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-foreground/30 transition-colors"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
    >
      <Upload className="h-7 w-7 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm font-medium text-center mb-4">Drop a CSV file or click to browse</p>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-2 text-left">
        {COLUMNS.map((col) => (
          <div key={col.name} className="flex items-baseline gap-1.5 min-w-0">
            <code className="text-[11.5px] shrink-0">{col.name}</code>
            {col.required && (
              <span className="text-[10px] font-semibold text-destructive shrink-0">required</span>
            )}
            <span className="text-[11px] text-muted-foreground truncate">{col.desc}</span>
          </div>
        ))}
        <div className="col-span-2 flex items-baseline gap-1.5">
          <code className="text-[11.5px] text-muted-foreground shrink-0">any other column</code>
          <span className="text-[11px] text-muted-foreground">Saved as a custom attribute</span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground text-center mt-3 mb-4">
        Column order doesn't matter — headers are matched by name.
      </p>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); downloadSample(); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-accent transition-colors"
        >
          <Download className="h-3 w-3" /> Download sample CSV
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
    </div>
  );
}
