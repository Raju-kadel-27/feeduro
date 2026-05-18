import type { BoardSummary } from "../schemas/analytics";

interface BoardHealthListProps {
  boards: BoardSummary[];
}

export function BoardHealthList({ boards }: BoardHealthListProps) {
  if (boards.length === 0) {
    return <p className="text-sm text-[#a1a1aa] py-8 text-center">No boards yet.</p>;
  }

  return (
    <div className="space-y-3">
      {boards.map((board) => (
        <div key={board.boardId} className="rounded-lg border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#18181b] truncate">
              {board.boardName}
            </span>
            <span className="text-xs tabular-nums text-[#71717a]">{board.totalVotes} votes</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-[#a1a1aa]">
              <span>Resolution rate</span>
              <span className="tabular-nums">{board.resolutionRate}%</span>
            </div>
            <div className="h-1.5 bg-[#f4f4f5] rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${board.resolutionRate}%` }}
              />
            </div>
          </div>

          <div className="flex gap-4 text-[11px] text-[#71717a]">
            <span>
              <span className="font-medium text-[#3f3f46]">{board.openPosts}</span> open
            </span>
            <span>
              <span className="font-medium text-[#3f3f46]">{board.resolvedPosts}</span> resolved
            </span>
            <span>
              <span className="font-medium text-[#3f3f46]">{board.avgVotesPerPost}</span> avg votes
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
