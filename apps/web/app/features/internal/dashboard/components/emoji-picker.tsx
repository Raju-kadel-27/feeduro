import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover";
import { cn } from "@lib/utils";
import { useState } from "react";

const EMOJIS = [
  "📌", "📋", "🗂️", "🔖", "⭐", "🔔", "🚀", "🎯", "💡", "✅",
  "❌", "🔥", "⚡", "🚨", "⚠️", "🐛", "💬", "👥", "📊", "📈",
  "📉", "🏆", "💎", "⚙️", "🔧", "🛠️", "💻", "🔒", "🔍", "🔑",
  "🎨", "📦", "🧩", "🌟", "💪", "📝", "🎉", "🚧", "🔄", "📣",
  "🤝", "🧑‍💻", "🌐", "📅", "🎈", "🏗️", "🧠", "🔬", "📐", "🏅",
];

interface Props {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const display = value || "📌";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Choose icon"
          className="flex h-9 w-14 items-center justify-center rounded-md border border-input bg-background text-xl transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {display}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[248px] p-2" align="start">
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Choose icon
        </p>
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onChange(e);
                setOpen(false);
              }}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded text-base transition-colors hover:bg-accent",
                value === e && "bg-accent ring-1 ring-ring",
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
