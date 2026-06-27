import { PageHeader } from "@components/common/page-header";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@components/ui/empty";
import { SidebarTrigger } from "@components/ui/sidebar";
import type { Board, Category, Sort, Tag, View, ViewFilters } from "@features/internal/dashboard/types";
import type { Segment } from "@features/internal/segmentation/types";
import { useMutation } from "@tanstack/react-query";
import { Layers, LayoutDashboard, Plus } from "lucide-react";
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
      const res = await fetch("/api/views", {
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
            v.id === p.viewId
              ? { ...v, name: p.name, emoji: p.emoji, sort: p.sort, filters: p.filters }
              : v,
          ),
        );
        toast.success("View updated");
      }
      closeDialog();
    },
    onError: () => toast.error("Failed to save view"),
  });

  const {
    mutate: deleteView,
    isPending: isDeleting,
    variables: deletingViewId,
  } = useMutation({
    mutationFn: async (viewId: string) => {
      const res = await fetch("/api/views", {
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
  const customViews = views.filter((v) => !v.isSystem);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
        <PageHeader
          title="Views"
          icon={LayoutDashboard}
          description="Saved filter and sort combinations shown in the feedback sidebar. Built-in views cannot be modified or deleted."
          action={
            <button
              type="button"
              onClick={() => {
                setEditingView(null);
                setDialogOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" /> New view
            </button>
          }
        />

        <div className="rounded-lg border border-border overflow-hidden">
          {views.length === 0 ? (
            <Empty className="border-0 rounded-none py-12">
              <EmptyMedia variant="icon" className="size-14 [&_svg]:size-7 bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Layers />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No views yet</EmptyTitle>
                <EmptyDescription>
                  Create your first view to save filter combinations you use often.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              {views.map((view) => (
                <ViewRow
                  key={view.id}
                  view={view}
                  boards={boards}
                  tags={tags}
                  categories={categories}
                  segments={segments}
                  onEdit={(v) => {
                    setEditingView(v);
                    setDialogOpen(true);
                  }}
                  onDelete={(id) => deleteView(id)}
                  isDeleting={isDeleting && deletingViewId === view.id}
                />
              ))}
              {customViews.length === 0 && views.length > 0 && (
                <div className="px-4 py-3 border-t border-border bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    No custom views yet — click{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingView(null);
                        setDialogOpen(true);
                      }}
                      className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
                    >
                      New view
                    </button>{" "}
                    to create one.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <ViewFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!v) closeDialog();
          else setDialogOpen(true);
        }}
        initialView={editingView ?? undefined}
        boards={boards}
        tags={tags}
        categories={categories}
        segments={segments}
        onSave={handleSave}
        isPending={saving}
      />
    </>
  );
}
