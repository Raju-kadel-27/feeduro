import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { useNavigate, useSearchParams } from "react-router";
import type { BoardSummary } from "../schemas/analytics";

interface Props {
  boards: BoardSummary[];
}

export function BoardFilter({ boards }: Props) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const current = searchParams.get("board") ?? "all";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "all") params.delete("board");
    else params.set("board", value);
    navigate(`?${params.toString()}`);
  }

  if (boards.length < 2) return null;

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-44 text-xs">
        <SelectValue placeholder="All boards" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All boards</SelectItem>
        {boards.map((b) => (
          <SelectItem key={b.boardId} value={b.boardId}>
            {b.boardName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
