export const STATUS = {
  pending: { label: "Pending", color: "#f59e0b" },
  reviewing: { label: "Reviewing", color: "#f97316" },
  planned: { label: "Planned", color: "#3b82f6" },
  inprogress: { label: "In Progress", color: "#a855f7" },
  completed: { label: "Completed", color: "#22c55e" },
  closed: { label: "Closed", color: "#6b7280" },
} as const;

export type StatusKey = keyof typeof STATUS;
