import { cn } from "@lib/utils";
import { Check } from "lucide-react";

type StepState = "complete" | "active" | "locked";

interface SetupStepProps {
  number: number;
  title: string;
  state: StepState;
}

export function SetupStep({ number, title, state }: SetupStepProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
          state === "complete" && "bg-primary text-primary-foreground",
          state === "active" && "ring-2 ring-primary text-primary bg-transparent",
          state === "locked" && "bg-muted text-muted-foreground",
        )}
      >
        {state === "complete" ? <Check size={11} strokeWidth={2.5} /> : number}
      </span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );
}
