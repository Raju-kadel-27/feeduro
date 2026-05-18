import { cn } from "@lib/utils";
import { useEffect, useRef, useState } from "react";

const PRESET_EMOJI = [
  "📌",
  "🔥",
  "👀",
  "🚀",
  "⏱️",
  "✅",
  "💎",
  "⚡",
  "🎯",
  "🐛",
  "📣",
  "💬",
  "🎉",
  "📊",
];

interface SaveAsViewPopoverProps {
  defaultName: string;
  defaultEmoji: string;
  onSave: (name: string, emoji: string) => void;
  onCancel: () => void;
}

export function SaveAsViewPopover({
  defaultName,
  defaultEmoji,
  onSave,
  onCancel,
}: SaveAsViewPopoverProps) {
  const [name, setName] = useState(defaultName);
  const [emoji, setEmoji] = useState(defaultEmoji);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel();
    }
    function keyHandler(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [onCancel]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), emoji);
  }

  return (
    <div
      ref={ref}
      className="w-[380px] rounded-xl border border-[#ececec] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.18)] p-5 space-y-4"
    >
      <h3 className="text-sm font-semibold text-[#18181b]">Save as new view</h3>

      {/* Emoji picker */}
      <div className="flex flex-wrap gap-1">
        {PRESET_EMOJI.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            className={cn(
              "h-8 w-8 rounded-md text-base flex items-center justify-center transition-colors hover:bg-[#f4f4f5]",
              emoji === e && "ring-2 ring-[#18181b]",
            )}
          >
            {e}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="View name"
          maxLength={100}
          className="w-full px-2.5 py-1.5 rounded-md border border-[#d4d4d8] text-sm focus:outline-none focus:ring-2 focus:ring-[#18181b]"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!name.trim()}
            className="flex-1 px-3 py-1.5 rounded-md bg-[#18181b] text-white text-sm font-medium hover:bg-[#27272a] disabled:opacity-50 transition-colors"
          >
            Create view
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md border border-[#d4d4d8] text-sm hover:bg-[#f4f4f5] transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

interface NewViewFormProps {
  onSave: (name: string, emoji: string) => void;
  onCancel: () => void;
}

export function NewViewForm({ onSave, onCancel }: NewViewFormProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📌");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onCancel();
  }

  return (
    <div className="px-4 pt-4 pb-3 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#a1a1aa]">
        New view
      </p>
      {/* Emoji picker */}
      <div className="flex flex-wrap gap-1.5">
        {PRESET_EMOJI.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            className={cn(
              "h-8 w-8 rounded text-base flex items-center justify-center transition-colors hover:bg-[#f4f4f5]",
              emoji === e && "ring-2 ring-[#18181b]",
            )}
          >
            {e}
          </button>
        ))}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        onKeyUp={(e) => e.key === "Enter" && name.trim() && onSave(name.trim(), emoji)}
        placeholder="View name"
        maxLength={100}
        className="w-full px-3 py-1.5 rounded-md border border-[#d4d4d8] text-sm focus:outline-none focus:ring-2 focus:ring-[#18181b]"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => name.trim() && onSave(name.trim(), emoji)}
          className="flex-1 px-3 py-1.5 rounded-md bg-[#18181b] text-white text-sm font-medium hover:bg-[#27272a] disabled:opacity-50 transition-colors"
        >
          Create view
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md border border-[#d4d4d8] text-sm hover:bg-[#f4f4f5] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
