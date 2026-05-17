import { ExternalLink, X } from "lucide-react";
import { Link } from "react-router";
import type { IntegrationLink } from "@features/feedback/schemas/admin";

export function IntegrationMenuItem({
  icon,
  link,
  connectLabel,
  connectTo,
  accentColor,
  onLink,
  onUnlink,
  unlinking,
  onClose,
}: {
  icon: React.ReactNode;
  link: IntegrationLink | null;
  connectLabel: string;
  connectTo: string;
  accentColor: string;
  onLink: () => void;
  onUnlink: () => void;
  unlinking: boolean;
  onClose: () => void;
}) {
  if (link) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
        {icon}
        <span className="flex-1 font-mono truncate" style={{ color: accentColor }}>{link.identifier}</span>
        {link.externalUrl && (
          <a href={link.externalUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <button type="button" onClick={onUnlink} disabled={unlinking} className="text-muted-foreground hover:text-destructive disabled:opacity-50 transition-colors">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }
  return (
    <>
      <Link to={connectTo} onClick={onClose} className="flex items-center gap-2.5 w-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors">
        {icon}
        {connectLabel}
      </Link>
      <button type="button" onClick={onLink} className="flex items-center gap-2.5 w-full px-3 py-1.5 text-xs hover:bg-muted transition-colors">
        {icon}
        Link existing
      </button>
    </>
  );
}
