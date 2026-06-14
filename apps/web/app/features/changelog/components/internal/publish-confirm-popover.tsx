import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover";
import { Spinner } from "@components/ui/spinner";
import { BellIcon } from "lucide-react";
import { useState } from "react";

interface Props {
  disabled: boolean;
  publishing: boolean;
  subscriptionsEnabled: boolean;
  onPublish: (notifySubscribers: boolean) => void;
}

export function PublishConfirmPopover({ disabled, publishing, subscriptionsEnabled, onPublish }: Props) {
  const [open, setOpen] = useState(false);
  const [notify, setNotify] = useState(true);

  function handleConfirm() {
    setOpen(false);
    onPublish(subscriptionsEnabled ? notify : false);
  }

  if (!subscriptionsEnabled) {
    return (
      <button
        type="button"
        onClick={() => onPublish(false)}
        disabled={disabled}
        className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {publishing ? <Spinner className="size-3.5" /> : "Publish"}
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {publishing ? <Spinner className="size-3.5" /> : "Publish"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-4 space-y-4">
        <div>
          <p className="text-sm font-medium">Publish update</p>
          <p className="text-xs text-muted-foreground mt-0.5">Choose notification options.</p>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border accent-primary cursor-pointer"
          />
          <span className="text-sm leading-snug flex-1">
            <span className="flex items-center gap-1.5 font-medium">
              <BellIcon className="h-3.5 w-3.5" />
              Notify subscribers
            </span>
            <span className="text-xs text-muted-foreground">
              Email all active subscribers about this update.
            </span>
          </span>
        </label>

        <button
          type="button"
          onClick={handleConfirm}
          className="w-full px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Confirm publish
        </button>
      </PopoverContent>
    </Popover>
  );
}
