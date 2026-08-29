import { Button } from "@components/ui/button";
import { Dialog, DialogContent } from "@components/ui/dialog";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { cn } from "@lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bug, ChevronLeft, Globe, Lock, MessageSquare, Milestone, Sparkles } from "lucide-react";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";

interface TemplateItem {
  id: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  tagline: string;
  defaultName: string;
  defaultDesc: string;
}

const TEMPLATES: TemplateItem[] = [
  {
    id: "features",
    Icon: Sparkles,
    iconBg: "bg-violet-500/10 dark:bg-violet-500/15",
    iconColor: "text-violet-500",
    label: "Feature Requests",
    tagline: "Collect and prioritize ideas from your users.",
    defaultName: "Feature Requests",
    defaultDesc: "Share your ideas and feature requests with us.",
  },
  {
    id: "bugs",
    Icon: Bug,
    iconBg: "bg-rose-500/10 dark:bg-rose-500/15",
    iconColor: "text-rose-500",
    label: "Bug Reports",
    tagline: "Track and triage issues reported by users.",
    defaultName: "Bug Reports",
    defaultDesc: "Report bugs and unexpected behavior you encounter.",
  },
  {
    id: "general",
    Icon: MessageSquare,
    iconBg: "bg-sky-500/10 dark:bg-sky-500/15",
    iconColor: "text-sky-500",
    label: "General Feedback",
    tagline: "An open channel for any kind of suggestion.",
    defaultName: "General Feedback",
    defaultDesc: "",
  },
  {
    id: "roadmap",
    Icon: Milestone,
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    iconColor: "text-emerald-500",
    label: "Roadmap Input",
    tagline: "Let users weigh in on your future direction.",
    defaultName: "Roadmap Input",
    defaultDesc: "Vote and comment on what we should build next.",
  },
];

const VISIBILITY_OPTIONS = [
  { value: "public" as const, Icon: Globe, label: "Public", desc: "Anyone can view and submit" },
  { value: "private" as const, Icon: Lock, label: "Private", desc: "Team members only" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

async function callApi(url: string, body: object) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

export function NewBoardDialog({ open, onOpenChange }: Props) {
  const revalidator = useRevalidator();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"template" | "form">("template");
  const [activeTemplate, setActiveTemplate] = useState<TemplateItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  function reset() {
    setStep("template");
    setActiveTemplate(null);
    setName("");
    setDescription("");
    setVisibility("public");
  }

  function selectTemplate(t: TemplateItem) {
    setActiveTemplate(t);
    setName(t.defaultName);
    setDescription(t.defaultDesc);
    setStep("form");
  }

  function selectBlank() {
    setActiveTemplate(null);
    setName("");
    setDescription("");
    setStep("form");
  }

  const { mutate, isPending } = useMutation({
    mutationFn: () => callApi("/api/boards", { intent: "create", name, description, visibility }),
    onSuccess: () => {
      toast.success("Board created");
      onOpenChange(false);
      reset();
      revalidator.revalidate();
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-[580px] p-0 gap-0 rounded-2xl overflow-hidden [&>button]:hidden">

        {step === "template" ? (
          <>
            {/* Template picker header */}
            <div className="px-8 pt-8 pb-5">
              <h2 className="text-xl font-semibold tracking-tight">Create a board</h2>
              <p className="text-[15px] text-muted-foreground mt-1.5">
                Start from a template or build from scratch.
              </p>
            </div>

            {/* Template grid */}
            <div className="px-6 pb-4 grid grid-cols-2 gap-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTemplate(t)}
                  className="group flex flex-col items-start gap-4 rounded-xl border border-border p-5 text-left transition-all hover:border-border/60 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", t.iconBg)}>
                    <t.Icon className={cn("h-5 w-5", t.iconColor)} />
                  </div>
                  <div>
                    <p className="text-[17px] font-semibold text-foreground leading-tight">{t.label}</p>
                    <p className="text-[15px] text-muted-foreground mt-1.5 leading-snug">{t.tagline}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Start blank */}
            <div className="border-t border-border/60 px-6 py-4">
              <button
                type="button"
                onClick={selectBlank}
                className="w-full py-2.5 rounded-xl text-[16px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                Start blank →
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Form step header */}
            <div className="flex items-center gap-4 px-7 py-5 border-b border-border/60">
              <button
                type="button"
                onClick={() => setStep("template")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {activeTemplate && (
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", activeTemplate.iconBg)}>
                  <activeTemplate.Icon className={cn("h-5 w-5", activeTemplate.iconColor)} />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[16px] font-semibold truncate leading-tight">
                  {activeTemplate?.label ?? "Blank board"}
                </p>
                <p className="text-[13px] text-muted-foreground mt-0.5">Customize before creating</p>
              </div>
            </div>

            {/* Form fields */}
            <form
              id="new-board-form"
              onSubmit={(e) => { e.preventDefault(); mutate(); }}
              className="px-7 pt-6 pb-5 space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="board-name" className="text-[16px]">Board name</Label>
                <Input
                  id="board-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Feature Requests"
                  required
                  maxLength={80}
                  autoFocus
                  className="h-11 text-[15px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="board-desc" className="text-[16px]">
                  Description{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="board-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What kind of feedback goes here?"
                  maxLength={200}
                  className="h-11 text-[15px]"
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-[16px]">Visibility</Label>
                <div className="grid grid-cols-2 gap-3">
                  {VISIBILITY_OPTIONS.map(({ value, Icon, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setVisibility(value)}
                      className={cn(
                        "flex flex-col items-start gap-2.5 rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        visibility === value
                          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/25"
                          : "border-border hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn("h-4 w-4", visibility === value ? "text-primary" : "text-muted-foreground")} />
                        <span className={cn("text-[16px] font-semibold", visibility === value ? "text-primary" : "text-foreground")}>
                          {label}
                        </span>
                      </div>
                      <span className="text-[14.5px] leading-snug text-muted-foreground">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 px-7 py-5 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                className="h-10 px-5 text-[14px]"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="new-board-form"
                className="h-10 px-5 text-[14px]"
                disabled={isPending || !name.trim()}
              >
                {isPending ? "Creating…" : "Create board"}
              </Button>
            </div>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}
