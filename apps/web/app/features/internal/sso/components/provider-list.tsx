import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@components/ui/empty";
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/ui/tooltip";
import { callSSOApi } from "@features/internal/sso/api";
import type { SSOProvider } from "@features/internal/sso/server/queries";
import { cn } from "@lib/utils";
import { useMutation } from "@tanstack/react-query";
import { Shield, Trash2 } from "lucide-react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";

interface ProviderListProps {
  providers: SSOProvider[];
  isAdmin: boolean;
}

export function ProviderList({ providers, isAdmin }: ProviderListProps) {
  const revalidator = useRevalidator();

  const { mutate: deleteProvider, isPending: deleting } = useMutation({
    mutationFn: (id: string) => callSSOApi({ intent: "delete", id }),
    onSuccess: () => {
      toast.success("SSO provider removed");
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (providers.length === 0) {
    return (
      <Empty className="border border-border">
        <EmptyMedia variant="icon" className="bg-teal-500/10 text-teal-600 dark:text-teal-400"><Shield /></EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>No SSO provider configured yet</EmptyTitle>
          <EmptyDescription>Configure a SAML or OIDC provider to enable single sign-on for your workspace.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <div className="grid grid-cols-[1fr_auto] items-center px-4 h-12 bg-muted/20 border-b border-border">
        <div className="text-sm text-muted-foreground">Provider</div>
        <div className="text-sm text-muted-foreground pr-8">Type</div>
      </div>
      <ul>
        {providers.map((p, i) => (
          <li
            key={p.id}
            className={cn(
              "grid grid-cols-[1fr_auto] items-center px-4 py-3",
              i !== 0 && "border-t border-border",
            )}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">
                  {p.domain ?? p.issuer}
                </span>
                <span className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary uppercase shrink-0">
                  {p.type}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate mt-1">{p.issuer}</p>
            </div>
            {isAdmin && (
              <Popover>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <PopoverTrigger asChild>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          disabled={deleting}
                          className="p-2 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </TooltipTrigger>
                    </PopoverTrigger>
                    <TooltipContent>Remove provider</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <PopoverContent side="left" className="w-64 p-4 space-y-3">
                  <p className="text-sm font-medium">Remove this provider?</p>
                  <p className="text-xs text-muted-foreground">
                    Members using SSO via this provider will lose access.
                  </p>
                  <div className="flex justify-end gap-2">
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted/30 transition-colors"
                      >
                        Cancel
                      </button>
                    </PopoverTrigger>
                    <button
                      type="button"
                      onClick={() => deleteProvider(p.id)}
                      disabled={deleting}
                      className="px-3 py-1.5 text-xs rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
