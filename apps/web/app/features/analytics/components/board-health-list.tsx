import type { BoardSummary } from "../schemas/analytics";

interface BoardHealthListProps {
  boards: BoardSummary[];
}

export function BoardHealthList({ boards }: BoardHealthListProps) {
  if (boards.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No boards yet.</p>;
  }

  return (
    <div className="space-y-3">
      {boards.map((board) => (
        <div key={board.boardId} className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground truncate">
              {board.boardName}
            </span>
            <span className="text-sm tabular-nums text-muted-foreground">{board.totalVotes} votes</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Resolution rate</span>
              <span className="tabular-nums">{board.resolutionRate}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${board.resolutionRate}%` }}
              />
            </div>
          </div>

          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{board.openPosts}</span> open
            </span>
            <span>
              <span className="font-semibold text-foreground">{board.resolvedPosts}</span> resolved
            </span>
            <span>
              <span className="font-semibold text-foreground">{board.avgVotesPerPost}</span> avg votes
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
