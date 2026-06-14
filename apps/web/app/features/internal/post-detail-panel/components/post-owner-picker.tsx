import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover";
import type { OrgMember } from "@features/feedback/schemas/admin";
import { cn } from "@lib/utils";
import { Check, UserMinus, Users } from "lucide-react";
import { useState } from "react";
import { FeedbackAvatar } from "@features/feedback/components/feedback-avatar";

interface OwnerPickerProps {
  ownerId: string | null;
  ownerName: string | null;
  ownerImage: string | null;
  orgAdmins: OrgMember[];
  isAdmin: boolean;
  assigning: boolean;
  onAssign: (newOwnerId: string | null) => void;
}

export function OwnerPicker({
  ownerId,
  ownerName,
  ownerImage,
  orgAdmins,
  isAdmin,
  assigning,
  onAssign,
}: OwnerPickerProps) {
  const [open, setOpen] = useState(false);

  const trigger = (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors",
        isAdmin
          ? "hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground"
          : "cursor-default text-muted-foreground",
        assigning && "opacity-50 pointer-events-none",
      )}
    >
      {ownerId ? (
        <>
          <FeedbackAvatar name={ownerName ?? "?"} image={ownerImage} size={14} />
          <span className="font-medium text-foreground/80 max-w-[100px] truncate">
            {ownerName ?? "Unknown"}
          </span>
        </>
      ) : (
        <>
          <Users className="h-3.5 w-3.5" />
          <span>Unassigned</span>
        </>
      )}
    </div>
  );

  if (!isAdmin) return trigger;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="p-1 w-52" align="start">
        <p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Assign owner
        </p>

        {orgAdmins.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              onAssign(m.id === ownerId ? null : m.id);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-muted transition-colors text-left"
          >
            <FeedbackAvatar name={m.name ?? m.id} image={m.image} size={18} />
            <span className="flex-1 truncate">{m.name ?? m.id}</span>
            {m.id === ownerId && <Check className="h-3 w-3 text-primary shrink-0" />}
          </button>
        ))}

        {ownerId && (
          <>
            <div className="my-1 border-t" />
            <button
              type="button"
              onClick={() => {
                onAssign(null);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-muted transition-colors text-left text-muted-foreground"
            >
              <UserMinus className="h-3.5 w-3.5" />
              Unassign
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
