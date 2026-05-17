import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Plus } from "lucide-react";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { BoardsTable } from "./boards-table";
import { CategoriesTable } from "./categories-table";
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
  geminiConfigured: boolean;
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

const DEFAULT_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#3b82f6", "#ec4899", "#14b8a6",
];

export function FeedbackSettingsPanel({
  boards: rawBoards,
  tags: initialTags,
  categories: initialCategories,
  isAdmin,
  limit,
  enableRoadmap: initialRoadmap,
  weeklyDigest: initialDigest,
  geminiConfigured,
}: FeedbackSettingsPanelProps) {
  const revalidator = useRevalidator();
  const queryClient = useQueryClient();

  const [enableRoadmap, setEnableRoadmap] = useState(initialRoadmap);
  const [weeklyDigest, setWeeklyDigest] = useState(initialDigest);
  const [tags, setTags] = useState<FeedbackTag[]>(initialTags);
  const [categories, setCategories] = useState<FeedbackCategory[]>(initialCategories);

  // Board create form
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDesc, setNewBoardDesc] = useState("");
  const [newBoardVisibility, setNewBoardVisibility] = useState<"public" | "private">("public");

  // Tag create form
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(DEFAULT_COLORS[0]);

  // Category create form
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(DEFAULT_COLORS[0]);

  const boards: FeedbackBoard[] = rawBoards.map((b, i) => ({
    ...b,
    color: COLORS[i % COLORS.length],
  }));

  const atLimit = boards.length >= limit;

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
    }: { id: string; enabled: boolean; instructions: string | null }) =>
      callApi("/api/boards", { intent: "update-smart-replies", id, enabled, instructions }),
    onSuccess: () => {
      revalidator.revalidate();
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: createBoard, isPending: creatingBoard } = useMutation({
    mutationFn: () =>
      callApi("/api/boards", {
        intent: "create",
        name: newBoardName,
        description: newBoardDesc,
        visibility: newBoardVisibility,
      }),
    onSuccess: () => {
      toast.success("Board created");
      setShowCreateBoard(false);
      setNewBoardName("");
      setNewBoardDesc("");
      setNewBoardVisibility("public");
      revalidator.revalidate();
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: createTag, isPending: creatingTag } = useMutation({
    mutationFn: () => callApi("/api/tags", { intent: "create", name: newTagName, color: newTagColor }),
    onSuccess: (data) => {
      const d = data as { tag?: FeedbackTag };
      if (d.tag) setTags((prev) => [...prev, d.tag as FeedbackTag]);
      toast.success("Tag created");
      setShowCreateTag(false);
      setNewTagName("");
      setNewTagColor(DEFAULT_COLORS[0]);
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
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

  const { mutate: createCategory, isPending: creatingCategory } = useMutation({
    mutationFn: () =>
      callApi("/api/categories", { intent: "create", name: newCategoryName, color: newCategoryColor }),
    onSuccess: (data) => {
      const d = data as { category?: FeedbackCategory };
      if (d.category) setCategories((prev) => [...prev, d.category as FeedbackCategory]);
      toast.success("Category created");
      setShowCreateCategory(false);
      setNewCategoryName("");
      setNewCategoryColor(DEFAULT_COLORS[0]);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: deleteCategory } = useMutation({
    mutationFn: (categoryId: string) => callApi("/api/categories", { intent: "delete", categoryId }),
    onMutate: (categoryId) => setCategories((prev) => prev.filter((c) => c.id !== categoryId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
    onError: (err) => {
      toast.error(err.message);
      revalidator.revalidate();
    },
  });

  return (
    <div className="w-full max-w-[640px] space-y-10">
      <div>
        <h2 className="text-base font-semibold text-foreground">Feedback</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure feedback behavior, boards, tags, and categories for your workspace.
        </p>
      </div>

      {/* General */}
      <section className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground mb-1">General</h3>
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

      {/* Boards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Feedback Boards</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Boards group feedback by topic. Each board can be public or private.
            </p>
          </div>
          {isAdmin && !showCreateBoard && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCreateBoard(true)}
                disabled={atLimit}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
              >
                <Plus size={14} />
                New board
              </button>
              {atLimit && (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertCircle size={13} />
                  Plan limit reached
                </span>
              )}
            </div>
          )}
        </div>

        {!geminiConfigured && (
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            Add <code className="font-mono text-xs">GEMINI_API_KEY</code> to your environment to enable Smart Replies.
          </div>
        )}
        <BoardsTable
          boards={boards}
          onChangeVisibility={(id, visibility) => updateVisibility({ id, visibility })}
          onUpdateSmartReplies={(id, enabled, instructions) =>
            updateSmartReplies({ id, enabled, instructions })
          }
        />

        {isAdmin && showCreateBoard && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createBoard();
            }}
            className="rounded-lg border border-border bg-card p-5 space-y-4"
          >
            <h4 className="text-sm font-semibold text-foreground">New Board</h4>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Name</label>
              <input
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="e.g. Feature Requests"
                required
                maxLength={80}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Description <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                type="text"
                value={newBoardDesc}
                onChange={(e) => setNewBoardDesc(e.target.value)}
                placeholder="What kind of feedback goes here?"
                maxLength={200}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Visibility</label>
              <select
                value={newBoardVisibility}
                onChange={(e) => setNewBoardVisibility(e.target.value as "public" | "private")}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="public">Public — anyone can see and submit</option>
                <option value="private">Private — team members only</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={creatingBoard || !newBoardName.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {creatingBoard ? "Creating…" : "Create board"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateBoard(false);
                  setNewBoardName("");
                  setNewBoardDesc("");
                }}
                className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Tags */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Feedback Tags</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tags help team members categorize and filter feedback posts.
            </p>
          </div>
          {isAdmin && !showCreateTag && (
            <button
              type="button"
              onClick={() => setShowCreateTag(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
            >
              <Plus size={14} />
              New tag
            </button>
          )}
        </div>

        <TagsTable tags={tags} isAdmin={isAdmin} onDelete={(id) => deleteTag(id)} />

        {isAdmin && showCreateTag && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTag();
            }}
            className="rounded-lg border border-border bg-card p-5 space-y-4"
          >
            <h4 className="text-sm font-semibold text-foreground">New Tag</h4>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium text-foreground">Name</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g. Bug"
                  required
                  maxLength={50}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Color</label>
                <div className="flex gap-1.5 flex-wrap pt-0.5">
                  {DEFAULT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewTagColor(c)}
                      className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        borderColor: newTagColor === c ? "#fff" : "transparent",
                        outline: newTagColor === c ? `2px solid ${c}` : "none",
                      }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={creatingTag || !newTagName.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {creatingTag ? "Creating…" : "Create tag"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateTag(false);
                  setNewTagName("");
                }}
                className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Categories */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Feedback Categories</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Users can select a category when submitting new feedback.
            </p>
          </div>
          {isAdmin && !showCreateCategory && (
            <button
              type="button"
              onClick={() => setShowCreateCategory(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
            >
              <Plus size={14} />
              New category
            </button>
          )}
        </div>

        <CategoriesTable
          categories={categories}
          isAdmin={isAdmin}
          onDelete={(id) => deleteCategory(id)}
        />

        {isAdmin && showCreateCategory && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createCategory();
            }}
            className="rounded-lg border border-border bg-card p-5 space-y-4"
          >
            <h4 className="text-sm font-semibold text-foreground">New Category</h4>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium text-foreground">Name</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. UI/UX"
                  required
                  maxLength={100}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Color</label>
                <div className="flex gap-1.5 flex-wrap pt-0.5">
                  {DEFAULT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCategoryColor(c)}
                      className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        borderColor: newCategoryColor === c ? "#fff" : "transparent",
                        outline: newCategoryColor === c ? `2px solid ${c}` : "none",
                      }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={creatingCategory || !newCategoryName.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {creatingCategory ? "Creating…" : "Create category"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateCategory(false);
                  setNewCategoryName("");
                }}
                className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
