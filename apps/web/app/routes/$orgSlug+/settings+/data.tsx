import { PageHeader } from "@components/common/page-header";
import { Button } from "@components/ui/button";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { Database, DownloadIcon, FileSpreadsheetIcon, UploadIcon } from "lucide-react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/data";

export function meta() {
  return [{ title: "Data & Import — Feeduro" }];
}

export function shouldRevalidate() {
  return false;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { org } = await requireOrgBySlug(db, request, params.orgSlug);
  return {};
}

// ─── Import source card ───────────────────────────────────────────────────────

interface ImportSource {
  id: string;
  name: string;
  description: string;
  logo: React.ReactNode;
  comingSoon?: boolean;
}

const IMPORT_SOURCES: ImportSource[] = [
  {
    id: "csv",
    name: "Import from CSV",
    description: "Upload a CSV file with your feedback data.",
    logo: <FileSpreadsheetIcon className="h-5 w-5 text-green-600" />,
  },
  {
    id: "canny",
    name: "Import from Canny",
    description: "Migrate your boards, posts, and votes from Canny.",
    comingSoon: true,
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#4F46E5]" aria-hidden>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
      </svg>
    ),
  },
  {
    id: "productroad",
    name: "Import from ProductRoad",
    description: "Bring over your roadmap and feature requests from ProductRoad.",
    comingSoon: true,
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#0EA5E9]" aria-hidden>
        <path d="M3 3h18v4H3zM3 10h12v4H3zM3 17h8v4H3z" />
      </svg>
    ),
  },
  {
    id: "nolt",
    name: "Import from Nolt",
    description: "Import your feedback boards and votes from Nolt.",
    comingSoon: true,
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#6366F1]" aria-hidden>
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function DataImport(_: Route.ComponentProps) {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  function handleImport(sourceId: string) {
    toast.info(`${sourceId} import coming soon`);
  }

  function handleExport() {
    toast.info("CSV export coming soon");
  }

  return (
        <>
        <header className="flex h-14 shrink-0 items-center px-4">
        </header>

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
          <PageHeader title="Data & Import" icon={Database} />

          {/* ── Import ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <UploadIcon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Import</h2>
            </div>

            <div className="rounded-lg border divide-y">
              {IMPORT_SOURCES.map((source) => (
                <div key={source.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                      {source.logo}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{source.name}</p>
                        {source.comingSoon && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600">
                            Coming soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{source.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={source.comingSoon}
                    onClick={() => handleImport(source.id)}
                  >
                    Import
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* ── Export ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <DownloadIcon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Export</h2>
            </div>

            <div className="rounded-lg border">
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                    <FileSpreadsheetIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">Export to CSV</p>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600">
                        Coming soon
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Download all your feedback data as a CSV file.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled onClick={handleExport}>
                  Export
                </Button>
              </div>
            </div>
          </section>

        </main>
        </>
  );
}
