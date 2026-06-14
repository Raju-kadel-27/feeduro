import type { Status } from "./types";

export const STATUS_ORDER: Status[] = [
  "open",
  "reviewing",
  "planned",
  "in-progress",
  "completed",
  "closed",
];

export const STATUS_CONFIG: Record<
  Status,
  { label: string; bg: string; text: string; dot: string; hexColor: string; border: string }
> = {
  open: {
    label: "Open",
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
    hexColor: "#94a3b8",
    border: "border-slate-300",
  },
  reviewing: {
    label: "Reviewing",
    bg: "bg-orange-50",
    text: "text-orange-500",
    dot: "bg-orange-400",
    hexColor: "#fb923c",
    border: "border-orange-300",
  },
  planned: {
    label: "Planned",
    bg: "bg-yellow-50",
    text: "text-yellow-600",
    dot: "bg-yellow-400",
    hexColor: "#facc15",
    border: "border-yellow-400",
  },
  "in-progress": {
    label: "In Progress",
    bg: "bg-purple-50",
    text: "text-purple-600",
    dot: "bg-purple-500",
    hexColor: "#8b5cf6",
    border: "border-purple-400",
  },
  completed: {
    label: "Completed",
    bg: "bg-green-50",
    text: "text-green-600",
    dot: "bg-green-500",
    hexColor: "#22c55e",
    border: "border-green-400",
  },
  closed: {
    label: "Closed",
    bg: "bg-red-50",
    text: "text-red-500",
    dot: "bg-red-400",
    hexColor: "#f87171",
    border: "border-red-300",
  },
};

export const AVATAR_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#22c55e",
  "#06b6d4",
  "#f59e0b",
  "#6366f1",
];
