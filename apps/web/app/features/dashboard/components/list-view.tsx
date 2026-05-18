import { STATUS_CONFIG, STATUS_ORDER } from "../constants";
import type { Board, Group, Post } from "../types";
import { GroupHeader } from "./group-header";
import { PostRow } from "./post-row";

export function ListView({
  posts,
  group,
  boardMap,
  queryKey,
  usersMap,
  onOpen,
}: {
  posts: Post[];
  group: Group;
  boardMap: Record<string, Board>;
  queryKey: readonly unknown[];
  usersMap: Record<string, { name: string; image: string | null }>;
  onOpen: (id: string) => void;
}) {
  let groups: { key: string; label: string; hexColor: string; items: Post[] }[];
  if (group === "status") {
    groups = STATUS_ORDER.map((s) => ({
      key: s,
      label: STATUS_CONFIG[s].label,
      hexColor: STATUS_CONFIG[s].hexColor,
      items: posts.filter((p) => p.status === s),
    })).filter((g) => g.items.length > 0);
  } else if (group === "board") {
    const seen = new Map<string, Post[]>();
    for (const p of posts) {
      if (!seen.has(p.boardId)) seen.set(p.boardId, []);
      seen.get(p.boardId)!.push(p);
    }
    groups = [...seen.entries()].map(([boardId, items]) => ({
      key: boardId,
      label: boardMap[boardId]?.name ?? "Unknown",
      hexColor: "#6366f1",
      items,
    }));
  } else {
    groups = [{ key: "all", label: "", hexColor: "", items: posts }];
  }

  return (
    <>
      {groups.map((g) => (
        <div key={g.key}>
          {group !== "none" && (
            <GroupHeader label={g.label} count={g.items.length} hexColor={g.hexColor} />
          )}
          {g.items.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              board={boardMap[post.boardId]}
              queryKey={queryKey}
              usersMap={usersMap}
              onOpen={onOpen}
            />
          ))}
        </div>
      ))}
    </>
  );
}
