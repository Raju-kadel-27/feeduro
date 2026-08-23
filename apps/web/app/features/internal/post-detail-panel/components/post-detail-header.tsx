import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@components/ui/alert-dialog";
import { buttonVariants } from "@components/ui/button";
import { ADMIN_STATUS_CONFIG } from "@features/feedback/constants";
import type { AdminStatus } from "@features/feedback/schemas/admin";
import { cn } from "@lib/utils";
import { ArrowLeft, ArrowUpRight, Check, GitMerge, Link2, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import type { useOwnerPicker } from "../hooks/use-owner-picker";
import type { useVoteStatus } from "../hooks/use-vote-status";
import { OwnerPicker } from "./post-owner-picker";
import { StatusPill } from "./post-status-pill";

type VoteState = ReturnType<typeof useVoteStatus>;
type OwnerState = ReturnType<typeof useOwnerPicker>;
type StatusConfig = (typeof ADMIN_STATUS_CONFIG)[AdminStatus];

export function PostDetailHeader({
  orgSlug,
  postId,
  postTitle,
  publicPostUrl,
  isAdmin,
  hasMergedInto,
  vote,
  owner,
  onMergeOpen,
  onDeletePost,
  onClose,
  fullPage,
}: {
  orgSlug: string;
  postId: string;
  postTitle: string;
  /** Absolute URL to the public board post (handles custom domains). Copied by the Share button. */
  publicPostUrl: string;
  isAdmin: boolean;
  hasMergedInto: boolean;
  vote: VoteState;
  owner: OwnerState;
  onMergeOpen: () => void;
  onDeletePost: () => void;
  onClose: () => void;
  fullPage?: boolean;
}) {
  const cfg = ADMIN_STATUS_CONFIG[vote.status] as StatusConfig;
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(publicPostUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const statusAndOwner = (
    <>
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
    </>
  );

  return (
    <header className={cn("flex items-center h-12 px-4 border-b shrink-0 gap-2", fullPage && "relative")}>
      {fullPage ? (
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-medium">Back</span>
        </button>
      ) : statusAndOwner}
      <div className="flex-1" />
      <div className={cn("flex items-center gap-0.5", fullPage && "absolute left-[32%] -translate-x-1/2")}>
        {fullPage && (
          <>
            {statusAndOwner}
            <div className="w-px h-4 bg-border shrink-0 mx-1" />
          </>
        )}
        {!fullPage && (
          <Link
            to={`/${orgSlug}/feedback/${postId}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Full page
          </Link>
        )}
        <button
          type="button"
          onClick={copyLink}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Link2 className="h-3.5 w-3.5" />}
          {copied ? "Copied!" : "Share"}
        </button>
        {isAdmin && !hasMergedInto && (
          <button
            type="button"
            onClick={onMergeOpen}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <GitMerge className="h-3.5 w-3.5" />
            Merge
          </button>
        )}
        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-destructive hover:bg-muted transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{postTitle}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the post and all its votes and comments. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDeletePost}
                  className={cn(buttonVariants({ variant: "destructive" }))}
                >
                  Delete post
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {!fullPage && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
}
