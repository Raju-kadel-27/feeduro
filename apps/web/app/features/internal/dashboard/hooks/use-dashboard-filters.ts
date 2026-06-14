import { useSearchParams } from "react-router";
import type { Group, Sort, Status, ViewMode } from "../types";

export function useDashboardFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const statuses = searchParams.getAll("status") as Status[];
  const boardIds = searchParams.getAll("boardId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const sort = (searchParams.get("sort") ?? "trending") as Sort;
  const group = (searchParams.get("group") ?? "none") as Group;
  const view = (searchParams.get("view") ?? "list") as ViewMode;

  function setParam(key: string, value: string | string[] | null) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (Array.isArray(value)) {
          next.delete(key);
          for (const v of value) next.append(key, v);
        } else if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  }

  function toggleStatus(status: Status) {
    const current = searchParams.getAll("status") as Status[];
    setParam(
      "status",
      current.includes(status) ? current.filter((s) => s !== status) : [...current, status],
    );
  }

  function toggleBoard(boardId: string) {
    const current = searchParams.getAll("boardId");
    setParam(
      "boardId",
      current.includes(boardId) ? current.filter((b) => b !== boardId) : [...current, boardId],
    );
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  const hasActiveFilters = statuses.length > 0 || boardIds.length > 0 || !!dateFrom || !!dateTo;

  return {
    statuses,
    boardIds,
    dateFrom,
    dateTo,
    sort,
    group,
    view,
    setParam,
    toggleStatus,
    toggleBoard,
    clearFilters,
    hasActiveFilters,
  };
}
