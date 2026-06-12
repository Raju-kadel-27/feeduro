import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Circle, Clock, Loader2, RotateCcw, XCircle } from "lucide-react";
import type { Status } from "./types";

export const COLUMNS: {
  id: Status;
  label: string;
  dot: string;
  accent: string;
  bg: string;
  icon: LucideIcon;
  pill: string;
}[] = [
  {
    id: "open",
    label: "Open",
    dot: "bg-slate-400",
    accent: "bg-slate-400",
    bg: "bg-slate-500/10",
    icon: Circle,
    pill: "border-slate-300 text-slate-600",
  },
  {
    id: "reviewing",
    label: "Under Review",
    dot: "bg-amber-400",
    accent: "bg-amber-400",
    bg: "bg-amber-500/10",
    icon: RotateCcw,
    pill: "border-amber-300 text-amber-600",
  },
  {
    id: "planned",
    label: "Planned",
    dot: "bg-blue-400",
    accent: "bg-blue-400",
    bg: "bg-blue-500/10",
    icon: Clock,
    pill: "border-blue-300 text-blue-600",
  },
  {
    id: "in-progress",
    label: "In Progress",
    dot: "bg-violet-500",
    accent: "bg-violet-500",
    bg: "bg-violet-500/10",
    icon: Loader2,
    pill: "border-violet-400 text-violet-600",
  },
  {
    id: "completed",
    label: "Completed",
    dot: "bg-emerald-500",
    accent: "bg-emerald-500",
    bg: "bg-emerald-500/10",
    icon: CheckCircle2,
    pill: "border-emerald-400 text-emerald-600",
  },
  {
    id: "closed",
    label: "Closed",
    dot: "bg-rose-400",
    accent: "bg-rose-400",
    bg: "bg-rose-500/10",
    icon: XCircle,
    pill: "border-rose-300 text-rose-500",
  },
];
