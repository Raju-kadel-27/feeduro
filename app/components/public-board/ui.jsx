// shadcn-ish primitives
const cn = (...a) => a.filter(Boolean).join(" ");

const Button = ({ variant = "default", size = "md", className = "", children, ...rest }) => {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    default:
      "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "text-foreground/80 hover:bg-muted hover:text-foreground",
    outline: "border border-border bg-transparent hover:bg-muted text-foreground",
    link: "text-foreground underline-offset-4 hover:underline",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4",
    lg: "h-10 px-5",
    icon: "h-9 w-9 p-0",
    pill: "h-10 px-5 rounded-full",
  };
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
};

const Badge = ({ className = "", children, ...rest }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-card/60 px-2 py-0.5 text-[11px] font-medium text-foreground/80",
      className,
    )}
    {...rest}
  >
    {children}
  </span>
);

const Avatar = ({ className = "", children }) => (
  <div
    className={cn(
      "relative inline-flex h-8 w-8 shrink-0 overflow-hidden rounded-full text-[11px] font-semibold text-white items-center justify-center select-none",
      className,
    )}
  >
    {children}
  </div>
);

const Separator = ({ className = "" }) => (
  <div className={cn("h-px w-full bg-border", className)} />
);

// Status tokens used across filters and pills
const STATUS = {
  pending: { label: "Pending", color: "#f59e0b" }, // amber
  reviewing: { label: "Reviewing", color: "#f97316" }, // orange
  planned: { label: "Planned", color: "#3b82f6" }, // blue
  inprogress: { label: "In Progress", color: "#a855f7" }, // purple
  completed: { label: "Completed", color: "#22c55e" }, // green
  closed: { label: "Closed", color: "#6b7280" }, // gray
};

// Filter chip — outlined ring dot, label
const FilterChip = ({ id, active, onClick }) => {
  const s = STATUS[id];
  return (
    <button
      onClick={onClick}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border px-3 h-8 text-xs transition-colors",
        active
          ? "border-border bg-muted text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60",
      )}
    >
      <span
        className="inline-flex h-3 w-3 items-center justify-center rounded-full border-[1.5px]"
        style={{ borderColor: s.color }}
      />
      <span>{s.label}</span>
    </button>
  );
};

// Status pill on a card — small filled-ring + label, in a pill
const StatusPill = ({ id }) => {
  const s = STATUS[id];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/70 px-2 h-6 text-[11px] text-foreground/80">
      <span
        className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full border-[1.5px]"
        style={{ borderColor: s.color }}
      />
      <span>{s.label}</span>
    </span>
  );
};

// Tag-like board chip used inline in card meta — "Board 1 [ Features ]"
const BoardInline = ({ name, label }) => (
  <span className="text-muted-foreground">
    {name} <span className="text-muted-foreground/70">[ {label} ]</span>
  </span>
);

Object.assign(window, {
  cn,
  Button,
  Badge,
  Avatar,
  Separator,
  STATUS,
  FilterChip,
  StatusPill,
  BoardInline,
});
