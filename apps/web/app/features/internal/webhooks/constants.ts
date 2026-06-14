export const SUPPORTED_EVENTS = [
  { value: "feedback.created", label: "Feedback created" },
  { value: "feedback.status_changed", label: "Feedback status changed" },
  { value: "comment.created", label: "Comment created" },
  { value: "changelog.created", label: "Changelog created" },
  { value: "changelog.published", label: "Changelog published" },
] as const;
