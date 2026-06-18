import type { View } from "../types";
import { ChipOptionRow } from "./chip-option-row";
import { ChipPopover } from "./chip-popover";
import { ChipTrigger } from "./chip-trigger";

interface ViewsChipProps {
  views: View[];
  activeViewId: string | null;
  activeView: View | undefined;
  viewCounts: Record<string, number>;
  onSwitchView: (viewId: string) => void;
  onClearView: () => void;
}

export function ViewsChip({
  views,
  activeViewId,
  activeView,
  viewCounts,
  onSwitchView,
  onClearView,
}: ViewsChipProps) {
  const isActive = !!activeViewId;

  return (
    <ChipTrigger
      label="Views"
      isActive={isActive}
      activeLabel={isActive ? (activeView?.name ?? "View") : undefined}
      onClear={onClearView}

    >
      {(close) => (
        <ChipPopover>
          {views.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No views yet</p>
          ) : (
            <ul>
              {views.map((view) => (
                <li key={view.id}>
                  <ChipOptionRow
                    label={view.name}
                    isSelected={activeView?.id === view.id}
                    count={viewCounts[view.id]}
                    prefix={<span className="text-base leading-none shrink-0">{view.emoji}</span>}
                    onClick={() => { onSwitchView(view.id); close(); }}
                  />
                </li>
              ))}
            </ul>
          )}
        </ChipPopover>
      )}
    </ChipTrigger>
  );
}
