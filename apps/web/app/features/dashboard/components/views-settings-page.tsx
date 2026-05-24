import { PageTitle } from "@/app/components/common/page-title";
import { SidebarInset, SidebarProvider } from "@components/ui/sidebar";
import type { Board, Category, Sort, Tag, View, ViewFilters } from "@features/dashboard/types";
import { AppSidebar } from "@features/layout/components/app-sidebar/app-sidebar";
import type { Segment } from "@features/segmentation/types";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ViewFormDialog } from "./view-form-dialog";
import { ViewRow } from "./view-row";

interface LoaderData {
  views: View[];
  boards: Board[];
  tags: Tag[];
  categories: Category[];
  segments: Segment[];
}

type SavePayload = { name: string; emoji: string; sort: Sort; filters: ViewFilters };

export function ViewsSettingsPage({ loaderData }: { loaderData: LoaderData }) {
  const [views, setViews] = useState(loaderData.views);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingView, setEditingView] = useState<View | null>(null);

  const { mutate: saveView, isPending: saving } = useMutation({
    mutationFn: async (payload: object) => {
      const res = await fetch("/api/_views/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json() as Promise<{ view?: View; success?: boolean }>;
    },
    onSuccess: (data, payload) => {
      const p = payload as { intent: string; viewId?: string } & SavePayload;
      if (p.intent === "create" && data.view) {
        setViews((prev) => [...prev, data.view!]);
        toast.success("View created");
      } else if (p.intent === "update") {
        setViews((prev) =>
          prev.map((v) =>
            v.id === p.viewId ? { ...v, name: p.name, emoji: p.emoji, sort: p.sort, filters: p.filters } : v,
          ),
        );
        toast.success("View updated");
      }
      closeDialog();
    },
    onError: () => toast.error("Failed to save view"),
  });

  const { mutate: deleteView } = useMutation({
    mutationFn: async (viewId: string) => {
      const res = await fetch("/api/_views/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "delete", viewId }),
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: (_, viewId) => {
      setViews((prev) => prev.filter((v) => v.id !== viewId));
      toast.success("View deleted");
    },
    onError: () => toast.error("Failed to delete view"),
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingView(null);
  }

  function handleSave(data: SavePayload) {
    if (editingView) {
      saveView({ intent: "update", viewId: editingView.id, ...data });
    } else {
      saveView({ intent: "create", ...data });
    }
  }

  const { boards, tags, categories, segments } = loaderData;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageTitle
          title="Views"
          action={
            <button
              type="button"
              onClick={() => { setEditingView(null); setDialogOpen(true); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[15px] font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" /> New view
            </button>
          }
        />
        <main className="p-6 max-w-[840px] mx-auto w-full space-y-6">
          <p className="text-sm text-muted-foreground">
            Views are saved filter and sort combinations shown in the feedback sidebar. Built-in views cannot be modified or deleted.
          </p>
          <div className="rounded-lg border border-border overflow-hidden">
            {views.map((view) => (
              <ViewRow
                key={view.id}
                view={view}
                boards={boards}
                tags={tags}
                categories={categories}
                segments={segments}
                onEdit={(v) => { setEditingView(v); setDialogOpen(true); }}
                onDelete={(id) => deleteView(id)}
              />
            ))}
          </div>
        </main>
      </SidebarInset>
      <ViewFormDialog
        open={dialogOpen}
        onOpenChange={(v) => { if (!v) closeDialog(); else setDialogOpen(true); }}
        initialView={editingView ?? undefined}
        boards={boards}
        tags={tags}
        categories={categories}
        segments={segments}
        onSave={handleSave}
        isPending={saving}
      />
    </SidebarProvider>
  );
}
