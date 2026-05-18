import { cn } from "@lib/utils";

interface Option {
  value: string;
  label: string;
}

interface BrandingSimpleSelectProps<T> {
  value: T;
  onChange: (value: T) => void;
  options: readonly Option[];
}

export function BrandingSimpleSelect<T extends string>({
  value,
  onChange,
  options,
}: BrandingSimpleSelectProps<T>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(
        "h-8 appearance-none rounded-md border border-border bg-transparent px-3 text-xs font-medium shadow-sm",
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
