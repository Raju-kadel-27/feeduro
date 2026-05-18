import { move } from "@dnd-kit/helpers";
import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import { ChevronUp, MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { COLUMNS } from "../constants";
import type { Groups, Post, Status } from "../types";
import { DraggableCard } from "./draggable-card";
import { DroppableColumn } from "./droppable-column";

function buildGroups(posts: Post[]): Groups {
  return COLUMNS.reduce((acc, col) => {
    acc[col.id] = posts.filter((p) => p.status === col.id).map((p) => p.id);
    return acc;
  }, {} as Groups);
}

export function KanbanBoard({
  posts,
  onStatusChange,
  hasGithubIntegration,
  onIssueCreated,
}: {
  posts: Post[];
  onStatusChange: (id: string, status: Status) => void;
  hasGithubIntegration: boolean;
  onIssueCreated: (postId: string, issueNumber: number, issueUrl: string) => void;
}) {
  const [groups, setGroups] = useState<Groups>(() => buildGroups(posts));
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const previousGroups = useRef(groups);
  const latestGroups = useRef(groups);
  const activeDrag = useRef(false);
  const hasInitialized = useRef(false);

  const postMap = new Map(posts.map((p) => [p.id, p]));

  useEffect(() => {
    if (activeDrag.current) return;

    if (!hasInitialized.current) {
      const g = buildGroups(posts);
      setGroups(g);
      latestGroups.current = g;
      hasInitialized.current = true;
      return;
    }

    // Preserve local drag order — only re-place posts that changed status or are new
    setGroups((current) => {
      const postStatusMap = new Map(posts.map((p) => [p.id, p.status]));
      const postIds = new Set(posts.map((p) => p.id));
      const result = {} as Groups;

      for (const col of COLUMNS) {
        result[col.id] = current[col.id].filter(
          (id) => postIds.has(id) && postStatusMap.get(id) === col.id,
        );
      }

      const tracked = new Set(Object.values(result).flat());
      for (const post of posts) {
        if (!tracked.has(post.id)) result[post.status].push(post.id);
      }

      latestGroups.current = result;
      return result;
    });
  }, [posts]);

  return (
    <DragDropProvider
      onDragStart={() => {
        activeDrag.current = true;
        setIsDraggingActive(true);
        previousGroups.current = structuredClone(groups);
      }}
      onDragOver={(event) => {
        setGroups((g) => {
          const next = move(g, event) as Groups;
          latestGroups.current = next;
          return next;
        });
      }}
      onDragEnd={(event) => {
        activeDrag.current = false;
        setIsDraggingActive(false);
        if (event.canceled) {
          setGroups(previousGroups.current);
          latestGroups.current = previousGroups.current;
          return;
        }
        const prev = previousGroups.current;
        const curr = latestGroups.current;
        for (const { id: status } of COLUMNS) {
          for (const itemId of curr[status]) {
            if (!prev[status].includes(itemId)) {
              onStatusChange(itemId, status);
            }
          }
        }
      }}
    >
      <div className="flex gap-3 h-full pb-2">
        {COLUMNS.map((col) => {
          const colPosts = (groups[col.id] ?? [])
            .map((id) => postMap.get(id))
            .filter((p): p is Post => p !== undefined);

          return (
            <DroppableColumn
              key={col.id}
              column={col}
              count={colPosts.length}
              isDraggingActive={isDraggingActive}
            >
              {colPosts.map((post, index) => (
                <DraggableCard
                  key={post.id}
                  post={post}
                  index={index}
                  column={col.id}
                  hasGithubIntegration={hasGithubIntegration}
                  onIssueCreated={onIssueCreated}
                />
              ))}
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay>
        {(source) => {
          const post = postMap.get(source.id as string);
          if (!post) return null;
          return (
            <div className="flex flex-col gap-2.5 p-3 w-[300px] rounded-lg border border-border bg-card shadow-2xl rotate-[1.5deg] opacity-95 cursor-grabbing">
              <p className="text-xs font-medium leading-snug line-clamp-2 text-foreground">
                {post.title}
              </p>
              {post.boardName && (
                <span className="inline-flex self-start items-center px-1.5 py-0.5 rounded-full text-[10px] border border-border/80 text-muted-foreground font-medium">
                  {post.boardName}
                </span>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                {post.authorImage ? (
                  <img
                    src={post.authorImage}
                    alt={post.authorName ?? ""}
                    className="h-5 w-5 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-semibold shrink-0">
                    {post.authorName?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <span className="flex items-center gap-1 text-[10px] tabular-nums ml-auto">
                  <ChevronUp className="h-3 w-3" />
                  {post.voteCount}
                </span>
                {post.commentCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] tabular-nums">
                    <MessageSquare className="h-3 w-3" />
                    {post.commentCount}
                  </span>
                )}
              </div>
            </div>
          );
        }}
      </DragOverlay>
    </DragDropProvider>
  );
}
