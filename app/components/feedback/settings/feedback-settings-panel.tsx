import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Info, Plus } from "lucide-react";
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
    <div className="w-full max-w-[640px] space-y-0">
      <header className="mb-6">
        <h2 className="text-[13px] font-semibold text-foreground">Feedback</h2>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Configure feedback behavior, boards, and tags.
        </p>
      </header>

      <div className="divide-y divide-border">
        <ToggleRow
          label="Enable Roadmap"
          hint="Show a public roadmap page to your users"
          checked={enableRoadmap}
          onChange={handleRoadmapChange}
          disabled={savingToggles}
        />
        <ToggleRow
          label="Weekly Digest Emails"
          hint="Send a weekly summary email to admins"
          checked={weeklyDigest}
          onChange={handleDigestChange}
          disabled={savingToggles}
        />
      </div>

      <section className="mt-8">
        <h3 className="text-[13px] font-semibold text-foreground mb-2">Feedback Boards</h3>
        <BoardsTable
          boards={boards}
          onChangeVisibility={(id, visibility) => updateVisibility({ id, visibility })}
        />

        {isAdmin && (
          <div className="mt-3">
            {!showCreate ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  disabled={atLimit}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                >
                  <Plus size={12} />
                  <span>Create Board</span>
                </button>
                {atLimit && (
                  <span title={`Free plan allows up to ${limit} boards`}>
                    <Info size={12} className="text-amber-600" />
                  </span>
                )}
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createBoard();
                }}
                className="rounded-md border border-border p-4 space-y-3 mt-2"
              >
                <h4 className="text-xs font-semibold text-foreground">New Board</h4>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Feature Requests"
                    required
                    maxLength={80}
                    className="w-full px-3 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Description <span className="font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="What kind of feedback goes here?"
                    maxLength={200}
                    className="w-full px-3 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Visibility</label>
                  <select
                    value={newVisibility}
                    onChange={(e) => setNewVisibility(e.target.value as "public" | "private")}
                    className="px-3 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="public">Public — anyone can see and submit</option>
                    <option value="private">Private — team only</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={creating || !newName.trim()}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {creating ? "Creating…" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreate(false);
                      setNewName("");
                      setNewDesc("");
                    }}
                    className="px-3 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted/50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h3 className="text-[13px] font-semibold text-foreground mb-2">Feedback Tags</h3>
        <TagsTable tags={tags} />
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground opacity-50 cursor-not-allowed"
          >
            <Plus size={12} />
            <span>Create Tag</span>
          </button>
          <span title="Tag management coming soon">
            <Info size={12} className="text-amber-600" />
          </span>
        </div>
      </section>
    </div>
  );
}
