import { ExternalLink, X } from "lucide-react";
import type { IntegrationLink } from "@features/feedback/schemas/admin";

export function LinearIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#5E6AD2" />
      <path d="M7 17L17 7M7 12.5L12.5 7" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function JiraIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path
        d="M15.975 0C12.146 7.935 13.18 5.828 7.81 16.434l8.165 8.165L31.95 8.634C31.95 8.634 19.804 13.811 15.975 0Z"
        fill="#2684FF"
      />
      <path
        d="M15.975 32c3.83-7.935 2.795-5.828 8.165-16.434l-8.165-8.165L0 23.366C0 23.366 12.146 18.189 15.975 32Z"
        fill="#2684FF"
      />
    </svg>
  );
}

export function AsanaIcon({ size = 13 }: { size?: number }) {
  const r = size * 0.19;
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={cx} cy={size * 0.38} r={r} fill="#F06A6A" />
      <circle cx={size * 0.3} cy={size * 0.65} r={r} fill="#F06A6A" />
      <circle cx={size * 0.7} cy={size * 0.65} r={r} fill="#F06A6A" />
    </svg>
  );
}

export function LinkedCard({
  icon,
  identifier,
  title,
  status,
  url,
  accentColor,
  onUnlink,
  unlinking,
  isAdmin,
}: {
  icon: React.ReactNode;
  identifier: IntegrationLink["identifier"];
  title: IntegrationLink["externalTitle"];
  status: IntegrationLink["externalStatus"];
  url: IntegrationLink["externalUrl"];
  accentColor: string;
  onUnlink: () => void;
  unlinking: boolean;
  isAdmin: boolean;
}) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {icon}
        <span className="text-xs font-mono font-semibold truncate" style={{ color: accentColor }}>
          {identifier}
        </span>
        {title && <span className="text-xs text-muted-foreground truncate">— {title}</span>}
        {status && (
          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-medium">
            {status}
          </span>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      {isAdmin && (
        <button
          type="button"
          onClick={onUnlink}
          disabled={unlinking}
          className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
