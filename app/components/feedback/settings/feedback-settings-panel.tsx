import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Plus } from "lucide-react";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { BoardsTable } from "./boards-table";
import { TagsTable } from "./tags-table";
import { ToggleRow } from "./toggle-row";
import type { FeedbackBoard, FeedbackTag } from "./types";
import { BOARD_COLORS as COLORS } from "./types";

interface FeedbackSettingsPanelProps {
  boards: Omit<FeedbackBoard, "color">[];
  tags: FeedbackTag[];
  isAdmin: boolean;
  limit: number;
  enableRoadmap: boolean;
  weeklyDigest: boolean;
}

async function callBoardsApi(body: object) {
  const res = await fetch("/api/boards", {
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
  tags,
  isAdmin,
  limit,
  enableRoadmap: initialRoadmap,
  weeklyDigest: initialDigest,
}: FeedbackSettingsPanelProps) {
  const revalidator = useRevalidator();
  const queryClient = useQueryClient();

  const [enableRoadmap, setEnableRoadmap] = useState(initialRoadmap);
  const [weeklyDigest, setWeeklyDigest] = useState(initialDigest);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newVisibility, setNewVisibility] = useState<"public" | "private">("public");

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
      callBoardsApi({ intent: "update-visibility", id, visibility }),
    onSuccess: () => revalidator.revalidate(),
    onError: (err) => toast.error(err.message),
  });

  const { mutate: createBoard, isPending: creating } = useMutation({
    mutationFn: () =>
      callBoardsApi({
        intent: "create",
        name: newName,
        description: newDesc,
        visibility: newVisibility,
      }),
    onSuccess: () => {
      toast.success("Board created");
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      setNewVisibility("public");
      revalidator.revalidate();
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="w-full max-w-[640px] space-y-10">
      {/* Page header */}
      <div>
        <h2 className="text-base font-semibold text-foreground">Feedback</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure feedback behavior, boards, and tags for your workspace.
        </p>
      </div>

      {/* General settings */}
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
          {isAdmin && !showCreate && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(true)}
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

        <BoardsTable
          boards={boards}
          onChangeVisibility={(id, visibility) => updateVisibility({ id, visibility })}
        />

        {isAdmin && showCreate && (
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
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Feature Requests"
                required
                maxLength={80}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Description{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What kind of feedback goes here?"
                maxLength={200}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Visibility</label>
              <select
                value={newVisibility}
                onChange={(e) => setNewVisibility(e.target.value as "public" | "private")}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="public">Public — anyone can see and submit</option>
                <option value="private">Private — team members only</option>
              </select>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {creating ? "Creating…" : "Create board"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setNewName("");
                  setNewDesc("");
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
              Tag management is coming soon.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-foreground opacity-40 cursor-not-allowed"
          >
            <Plus size={14} />
            New tag
          </button>
        </div>
        <TagsTable tags={tags} />
      </section>
    </div>
  );
}
