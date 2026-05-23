import { ADMIN_STATUS_CONFIG } from "@features/feedback/constants";
import type { AdminStatus } from "@features/feedback/schemas/admin";
import { ArrowUpRight, Smile, X } from "lucide-react";
import { Link } from "react-router";
import type { useIntegrationLinks } from "../hooks/use-integration-links";
import type { useOwnerPicker } from "../hooks/use-owner-picker";
import type { useVoteStatus } from "../hooks/use-vote-status";
import { AdminMenu } from "./post-admin-menu";
import { OwnerPicker } from "./post-owner-picker";
import { StatusPill } from "./post-status-pill";

type VoteState = ReturnType<typeof useVoteStatus>;
type Integrations = ReturnType<typeof useIntegrationLinks>;
type OwnerState = ReturnType<typeof useOwnerPicker>;
type StatusConfig = (typeof ADMIN_STATUS_CONFIG)[AdminStatus];

export function PostDetailHeader({
  orgSlug,
  postId,
  isAdmin,
  hasMergedInto,
  vote,
  integrations,
  owner,
  onMergeOpen,
  onClose,
}: {
  orgSlug: string;
  postId: string;
  isAdmin: boolean;
  hasMergedInto: boolean;
  vote: VoteState;
  integrations: Integrations;
  owner: OwnerState;
  onMergeOpen: () => void;
  onClose: () => void;
}) {
  const cfg = ADMIN_STATUS_CONFIG[vote.status] as StatusConfig;

  return (
    <header className="flex items-center h-12 px-4 border-b shrink-0 gap-2">
      <StatusPill cfg={cfg} isAdmin={isAdmin} status={vote.status} onUpdate={vote.updateStatus} />
      <div className="w-px h-4 bg-border shrink-0" />
      <OwnerPicker
        ownerId={owner.ownerId}
        ownerName={owner.ownerName}
        ownerImage={owner.ownerImage}
        orgAdmins={owner.orgAdmins}
        isAdmin={isAdmin}
        assigning={owner.assigning}
        onAssign={owner.assignOwner}
      />
      <div className="flex-1" />
      <div className="flex items-center gap-0.5">
        <Link
          to={`/${orgSlug}/feedback/${postId}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          Full page
        </Link>
        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Smile className="h-3.5 w-3.5" />
          Share
        </button>
        {isAdmin && (
          <AdminMenu
            orgSlug={orgSlug}
            hasMergedInto={hasMergedInto}
            integrations={integrations}
            onMergeOpen={onMergeOpen}
            onClose={onClose}
          />
        )}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
