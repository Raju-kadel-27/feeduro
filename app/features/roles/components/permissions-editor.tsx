import { RESOURCE_DEFINITIONS } from "../constants";
import type { ResourceKey } from "../types";

interface PermissionsEditorProps {
  value: Record<string, string[]>;
  onChange: (value: Record<string, string[]>) => void;
}

export function PermissionsEditor({ value, onChange }: PermissionsEditorProps) {
  const toggle = (resource: ResourceKey, perm: string) => {
    const current = value[resource] ?? [];
    const next = current.includes(perm)
      ? current.filter((p) => p !== perm)
      : [...current, perm];
    onChange({ ...value, [resource]: next });
  };

  return (
    <div className="space-y-4">
      {RESOURCE_DEFINITIONS.map((res) => (
        <div key={res.key}>
          <p className="text-sm font-medium mb-2">{res.label}</p>
          <div className="flex flex-wrap gap-2">
            {res.permissions.map((perm) => {
              const checked = (value[res.key] ?? []).includes(perm.value);
              return (
                <label
                  key={perm.value}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer select-none transition-colors ${
                    checked
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggle(res.key, perm.value)}
                  />
                  {perm.label}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
