export const STATUS = {
  pending:    { label: "Pending",     fg: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
  reviewing:  { label: "Under Review",fg: "#475569", bg: "#f1f5f9", dot: "#94a3b8" },
  planned:    { label: "Planned",     fg: "#1d4ed8", bg: "#dbeafe", dot: "#3b82f6" },
  inprogress: { label: "In Progress", fg: "#b45309", bg: "#fef3c7", dot: "#f59e0b" },
  completed:  { label: "Shipped",     fg: "#047857", bg: "#d1fae5", dot: "#10b981" },
  closed:     { label: "Closed",      fg: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
} as const;

export type StatusKey = keyof typeof STATUS;
