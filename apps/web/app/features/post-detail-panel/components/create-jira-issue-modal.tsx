import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@components/ui/dialog";
import { useEffect, useState } from "react";
import { z } from "zod";

const ProjectSchema = z.object({ id: z.string(), key: z.string(), name: z.string() });
const ProjectsResponseSchema = z.object({ projects: z.array(ProjectSchema) });

export function CreateJiraIssueModal({
  open,
  defaultSummary,
  defaultDescription,
  onClose,
  onSubmit,
  creating,
}: {
  open: boolean;
  defaultSummary: string;
  defaultDescription: string;
  onClose: () => void;
  onSubmit: (params: { summary: string; description: string; projectKey?: string }) => void;
  creating: boolean;
}) {
  const [summary, setSummary] = useState(defaultSummary);
  const [description, setDescription] = useState(defaultDescription);
  const [projectKey, setProjectKey] = useState("");
  const [projects, setProjects] = useState<z.infer<typeof ProjectSchema>[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSummary(defaultSummary);
    setDescription(defaultDescription);
    setLoadingProjects(true);
    fetch("/api/jira", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "list_projects" }),
    })
      .then((r) => r.json())
      .then((json) => {
        const parsed = ProjectsResponseSchema.safeParse(json);
        if (parsed.success) {
          setProjects(parsed.data.projects);
          if (parsed.data.projects[0]) setProjectKey(parsed.data.projects[0].key);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  }, [open, defaultSummary, defaultDescription]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ summary: summary.trim(), description: description.trim(), projectKey: projectKey || undefined });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md z-[60]">
        <DialogHeader>
          <DialogTitle className="text-base">Create a new Jira issue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Project</label>
              {loadingProjects ? (
                <div className="h-8 rounded border bg-muted animate-pulse" />
              ) : (
                <select
                  value={projectKey}
                  onChange={(e) => setProjectKey(e.target.value)}
                  className="w-full h-8 px-2 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {projects.map((p) => (
                    <option key={p.key} value={p.key}>[{p.key}] {p.name}</option>
                  ))}
                  {projects.length === 0 && <option value="">No projects found</option>}
                </select>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Issue Type</label>
              <select className="w-full h-8 px-2 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                <option>Task</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Summary</label>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              className="w-full h-8 px-2.5 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full px-2.5 py-2 text-xs border rounded bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={creating || !summary.trim()}
              className="px-4 py-2 text-xs font-semibold rounded bg-[#2684FF] text-white hover:bg-[#2684FF]/90 disabled:opacity-50 uppercase tracking-wide transition-colors"
            >
              {creating ? "Creating…" : "Create & Link Issue"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
