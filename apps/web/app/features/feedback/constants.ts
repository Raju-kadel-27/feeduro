import type { AdminStatus } from "./schemas/admin";
import type { StatusKey } from "./schemas/public";

export const ADMIN_STATUS_CONFIG: Record<
  AdminStatus,
  { label: string; dotColor: string; textColor: string; bgColor: string }
> = {
  open: {
    label: "Open",
    dotColor: "#94a3b8",
    textColor: "text-slate-600",
    bgColor: "bg-slate-100",
  },
  reviewing: {
    label: "Reviewing",
    dotColor: "#f97316",
    textColor: "text-orange-700",
    bgColor: "bg-orange-50",
  },
  planned: {
    label: "Planned",
    dotColor: "#eab308",
    textColor: "text-amber-700",
    bgColor: "bg-amber-50",
  },
  "in-progress": {
    label: "In Progress",
    dotColor: "#8b5cf6",
    textColor: "text-violet-700",
    bgColor: "bg-violet-50",
  },
  completed: {
    label: "Completed",
    dotColor: "#22c55e",
    textColor: "text-green-700",
    bgColor: "bg-green-50",
  },
  closed: { label: "Closed", dotColor: "#f87171", textColor: "text-red-600", bgColor: "bg-red-50" },
};

export const STATUS: Record<StatusKey, { label: string; fg: string; bg: string; dot: string }> = {
  pending: { label: "Pending", fg: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
  reviewing: { label: "Under Review", fg: "#475569", bg: "#f1f5f9", dot: "#94a3b8" },
  planned: { label: "Planned", fg: "#1d4ed8", bg: "#dbeafe", dot: "#3b82f6" },
  inprogress: { label: "In Progress", fg: "#b45309", bg: "#fef3c7", dot: "#f59e0b" },
  completed: { label: "Shipped", fg: "#047857", bg: "#d1fae5", dot: "#10b981" },
  closed: { label: "Closed", fg: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
};

export const BOARD_COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f97316", "#ef4444", "#06b6d4"];
export const AVATAR_COLORS = ["#7c3aed", "#2563eb", "#db2777", "#059669", "#d97706", "#0891b2"];
