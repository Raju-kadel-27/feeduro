import { Button } from "@components/ui/button";
import { SidebarTrigger } from "@components/ui/sidebar";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { DownloadIcon, FileSpreadsheetIcon, TriangleAlertIcon, UploadIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import type { Route } from "./+types/data";

export function meta() {
  return [{ title: "Data & Import — Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { org } = await requireOrgBySlug(request, params.orgSlug);
  return { orgName: org.name, orgId: org.id };
}

// ─── Import source card ───────────────────────────────────────────────────────

interface ImportSource {
  id: string;
  name: string;
  description: string;
  logo: React.ReactNode;
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
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#6366F1]" aria-hidden>
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function DataImport({ loaderData }: Route.ComponentProps) {
  const { orgName } = loaderData;
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();

  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm">("idle");
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  function handleImport(sourceId: string) {
    toast.info(`${sourceId} import coming soon`);
  }

  function handleExport() {
    toast.info("CSV export coming soon");
  }

  async function handleDeleteWorkspace() {
    if (deleteInput !== orgName) return;
    setDeleting(true);
    try {
      // TODO: wire up delete org action
      toast.success("Workspace deleted");
      navigate("/");
    } catch {
      toast.error("Failed to delete workspace");
      setDeleting(false);
    }
  }

  return (
        <>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium">Data & Import</span>
        </header>

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-10">
          <div>
            <h1 className="text-xl font-semibold">Data & Import</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Import data from existing tools or export your workspace data.
            </p>
          </div>

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
                      <p className="text-sm font-medium">{source.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{source.description}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleImport(source.id)}>
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
                    <p className="text-sm font-medium">Export to CSV</p>
                    <p className="text-xs text-muted-foreground">
                      Download all your feedback data as a CSV file.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  Export
                </Button>
              </div>
            </div>
          </section>

          {/* ── Danger Zone ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <TriangleAlertIcon className="h-4 w-4 text-destructive" />
              <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
            </div>

            <div className="rounded-lg border border-destructive/40 p-5">
              {deleteStep === "idle" ? (
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="text-sm font-medium">Delete this workspace</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Permanently delete <span className="font-medium">{orgName}</span> and all its
                      data. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => setDeleteStep("confirm")}
                  >
                    Delete Workspace
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-destructive">Are you absolutely sure?</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      This will permanently delete the{" "}
                      <span className="font-medium">{orgName}</span> workspace, all boards,
                      feedback, changelogs, and members. Type{" "}
                      <span className="font-mono font-semibold">{orgName}</span> to confirm.
                    </p>
                  </div>
                  <input
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder={orgName}
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-destructive"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={deleteInput !== orgName || deleting}
                      onClick={handleDeleteWorkspace}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? "Deleting…" : "I understand, delete this workspace"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDeleteStep("idle");
                        setDeleteInput("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
        </>
  );
}
