import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/ui/command";
import { NAV, PAGES } from "./docs-data";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
};

export function DocsSearch({ open, onOpenChange, onSelect }: Props) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search docs..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {NAV.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.items.map((item) => {
              const description = PAGES[item.id]?.description ?? "";
              return (
                <CommandItem
                  key={item.id}
                  value={`${item.title} ${group.label} ${description}`}
                  onSelect={() => {
                    onSelect(item.id);
                    onOpenChange(false);
                  }}
                >
                  <span className="font-medium">{item.title}</span>
                  {description && (
                    <span className="ml-2 max-w-[260px] truncate text-xs text-muted-foreground">
                      {description}
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
