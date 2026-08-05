import { Button } from "@components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { BoardsTable } from "./boards-table";
import { CategoriesTable } from "./categories-table";
import { NewBoardDialog } from "./new-board-dialog";
import { NewCategoryDialog } from "./new-category-dialog";
import { NewTagDialog } from "./new-tag-dialog";
import { TagsTable } from "./tags-table";
import { ToggleRow } from "./toggle-row";
import type { FeedbackBoard, FeedbackCategory, FeedbackTag } from "./types";
import { BOARD_COLORS as COLORS } from "./types";

interface FeedbackSettingsPanelProps {
  boards: Omit<FeedbackBoard, "color">[];
  tags: FeedbackTag[];
  categories: FeedbackCategory[];
  isAdmin: boolean;
  limit: number;
  enableRoadmap: boolean;
  weeklyDigest: boolean;
}

async function callApi(url: string, body: object) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

export function FeedbackSettingsPanel({
  boards: rawBoards,
  tags: initialTags,
  categories: initialCategories,
  isAdmin,
  limit,
  enableRoadmap: initialRoadmap,
  weeklyDigest: initialDigest,
}: FeedbackSettingsPanelProps) {
  const revalidator = useRevalidator();
  const queryClient = useQueryClient();

  const [enableRoadmap, setEnableRoadmap] = useState(initialRoadmap);
  const [weeklyDigest, setWeeklyDigest] = useState(initialDigest);
  const [tags, setTags] = useState<FeedbackTag[]>(initialTags);
  const [categories, setCategories] = useState<FeedbackCategory[]>(initialCategories);

  const [showBoardDialog, setShowBoardDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [taxonomyTab, setTaxonomyTab] = useState<"tags" | "categories">("tags");

  const boards: FeedbackBoard[] = rawBoards.map((b, i) => ({
    ...b,
    color: COLORS[i % COLORS.length],
  }));

  const { mutate: saveToggles, isPending: savingToggles } = useMutation({
    mutationFn: async (values: { enableRoadmap: boolean; weeklyDigest: boolean }) => {
      const res = await fetch("/api/feedback-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      return json;
    },
    onError: (err) => toast.error(err.message),
  });

  function handleRoadmapChange(val: boolean) {
    setEnableRoadmap(val);
    saveToggles({ enableRoadmap: val, weeklyDigest });
  }

  function handleDigestChange(val: boolean) {
    setWeeklyDigest(val);
    saveToggles({ enableRoadmap, weeklyDigest: val });
  }

  const { mutate: updateVisibility } = useMutation({
    mutationFn: ({ id, visibility }: { id: string; visibility: "public" | "private" }) =>
      callApi("/api/boards", { intent: "update-visibility", id, visibility }),
    onSuccess: () => revalidator.revalidate(),
    onError: (err) => toast.error(err.message),
  });

  const { mutate: updateSmartReplies } = useMutation({
    mutationFn: ({
      id,
      enabled,
      instructions,
    }: {
      id: string;
      enabled: boolean;
      instructions: string | null;
    }) => callApi("/api/boards", { intent: "update-smart-replies", id, enabled, instructions }),
    onSuccess: () => {
      revalidator.revalidate();
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: updateAnonymizeUsers } = useMutation({
    mutationFn: ({ id, anonymizeUsers }: { id: string; anonymizeUsers: boolean }) =>
      callApi("/api/boards", { intent: "update-anonymize-users", id, anonymizeUsers }),
    onSuccess: () => revalidator.revalidate(),
    onError: (err) => toast.error(err.message),
  });

  const { mutate: deleteTag } = useMutation({
    mutationFn: (tagId: string) => callApi("/api/tags", { intent: "delete", tagId }),
    onMutate: (tagId) => setTags((prev) => prev.filter((t) => t.id !== tagId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
    onError: (err) => {
      toast.error(err.message);
      revalidator.revalidate();
    },
  });

  const { mutate: deleteCategory } = useMutation({
    mutationFn: (categoryId: string) =>
      callApi("/api/categories", { intent: "delete", categoryId }),
    onMutate: (categoryId) => setCategories((prev) => prev.filter((c) => c.id !== categoryId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
    onError: (err) => {
      toast.error(err.message);
      revalidator.revalidate();
    },
  });

  return (
    <div className="w-full space-y-10">
      {/* Boards — most important, comes first */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Feedback Boards</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Boards group feedback by topic. Each board can be public or private.
            </p>
          </div>
          {isAdmin && (
            <Button variant="default" className="px-3" onClick={() => setShowBoardDialog(true)}>
              <Plus size={14} />
              New board
            </Button>
          )}
        </div>
        <BoardsTable
          boards={boards}
          onChangeVisibility={(id, visibility) => updateVisibility({ id, visibility })}
          onUpdateSmartReplies={(id, enabled, instructions) =>
            updateSmartReplies({ id, enabled, instructions })
          }
          onUpdateAnonymizeUsers={(id, anonymizeUsers) =>
            updateAnonymizeUsers({ id, anonymizeUsers })
          }
        />
      </section>

      {/* Taxonomy — Tags and Categories share the same card/structure, tabbed */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Taxonomy</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tags filter and classify posts internally. Categories are shown to submitters.
            </p>
          </div>
          {isAdmin && (
            <Button
              variant="default"
              className="px-3"
              onClick={() =>
                taxonomyTab === "tags" ? setShowTagDialog(true) : setShowCategoryDialog(true)
              }
            >
              <Plus size={14} />
              {taxonomyTab === "tags" ? "New tag" : "New category"}
            </Button>
          )}
        </div>
        <Tabs
          value={taxonomyTab}
          onValueChange={(v) => setTaxonomyTab(v as "tags" | "categories")}
        >
          <TabsList className="mb-3">
            <TabsTrigger value="tags">Tags</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>
          <TabsContent value="tags">
            <TagsTable tags={tags} isAdmin={isAdmin} onDelete={(id) => deleteTag(id)} />
          </TabsContent>
          <TabsContent value="categories">
            <CategoriesTable
              categories={categories}
              isAdmin={isAdmin}
              onDelete={(id) => deleteCategory(id)}
            />
          </TabsContent>
        </Tabs>
      </section>

      {/* General — org-level toggles, least frequently changed */}
      <section className="space-y-1">
        <h3 className="text-base font-semibold text-foreground mb-1">General</h3>
        <div className="rounded-lg border border-border bg-card divide-y divide-border px-4">
          <ToggleRow
            label="Enable Roadmap"
            hint="Show a public roadmap page so users can track what you're working on."
            checked={enableRoadmap}
            onChange={handleRoadmapChange}
            disabled={savingToggles}
          />
          <ToggleRow
            label="Weekly Digest Emails"
            hint="Send a weekly summary of new feedback and votes to workspace admins."
            checked={weeklyDigest}
            onChange={handleDigestChange}
            disabled={savingToggles}
          />
        </div>
      </section>

      <NewBoardDialog open={showBoardDialog} onOpenChange={setShowBoardDialog} />
      <NewTagDialog
        open={showTagDialog}
        onOpenChange={setShowTagDialog}
        onSuccess={(tag) => setTags((prev) => [...prev, tag])}
      />
      <NewCategoryDialog
        open={showCategoryDialog}
        onOpenChange={setShowCategoryDialog}
        onSuccess={(cat) => setCategories((prev) => [...prev, cat])}
      />
    </div>
  );
}
