import { move } from "@dnd-kit/helpers";
import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import { useEffect, useRef, useState } from "react";
import { COLUMNS } from "../constants";
import type { Groups, Post, Status } from "../types";
import { DragOverlayCard } from "./drag-overlay-card";
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
  onRankChange,
  hasGithubIntegration,
  onIssueCreated,
}: {
  posts: Post[];
  onStatusChange: (id: string, status: Status) => void;
  onRankChange: (status: Status, orderedIds: string[]) => void;
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

    const current = latestGroups.current;
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
    setGroups(result);
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
          const prevSet = new Set(prev[status]);
          const currOrder = curr[status];
          for (const itemId of currOrder) {
            if (!prevSet.has(itemId)) {
              onStatusChange(itemId, status);
            }
          }
          // Persist rank when items were added or reordered within this column
          const orderChanged =
            currOrder.some((id) => !prevSet.has(id)) ||
            (currOrder.length === prev[status].length &&
              currOrder.some((id, i) => id !== prev[status][i]));
          if (orderChanged) {
            onRankChange(status as Status, currOrder);
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
          return <DragOverlayCard post={post} />;
        }}
      </DragOverlay>
    </DragDropProvider>
  );
}
