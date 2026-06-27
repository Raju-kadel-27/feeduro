import type { BoardSummary } from "../schemas/analytics";

interface BoardHealthListProps {
  boards: BoardSummary[];
}

export function BoardHealthList({ boards }: BoardHealthListProps) {
  if (boards.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No boards yet.</p>;
  }

  return (
    <table className="w-full text-sm">
      <colgroup>
        <col />
        <col className="w-14" />
        <col className="w-16" />
        <col className="w-16" />
        <col className="w-28" />
      </colgroup>
      <thead>
        <tr className="border-b">
          <th className="pb-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Board</th>
          <th className="pb-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Open</th>
          <th className="pb-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Resolved</th>
          <th className="pb-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Votes</th>
          <th className="pb-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Resolution</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {boards.map((board) => (
          <tr key={board.boardId} className="hover:bg-muted/30 transition-colors">
            <td className="py-3 pr-6 font-medium text-foreground max-w-0">
              <span className="block truncate" title={board.boardName}>{board.boardName}</span>
            </td>
            <td className="py-3 text-right tabular-nums text-muted-foreground">{board.openPosts}</td>
            <td className="py-3 text-right tabular-nums text-muted-foreground">{board.resolvedPosts}</td>
            <td className="py-3 text-right tabular-nums text-muted-foreground">{board.totalVotes}</td>
            <td className="py-3 text-right">
              <div className="flex items-center justify-end gap-2">
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${board.resolutionRate}%` }}
                  />
                </div>
                <span className="tabular-nums text-xs text-muted-foreground w-8 text-right">
                  {board.resolutionRate}%
                </span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
