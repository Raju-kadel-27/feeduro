import { useMemo, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

export function TraitCombobox({ value, onChange, options, placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    const q = value.toLowerCase().trim();
    return options
      .filter((o) => o.toLowerCase().includes(q))
      .slice(0, 30);
  }, [options, value]);

  function handleBlur() {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  function handleFocus() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function pick(opt: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    onChange(opt);
    setOpen(false);
  }

  const showList = open && filtered.length > 0;

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {showList && (
        <ul className="absolute z-20 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto py-1">
          {filtered.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                onMouseDown={() => pick(opt)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors capitalize"
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
