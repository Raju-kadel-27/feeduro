import type { IntegrationLink } from "@features/feedback/schemas/admin";
import { ExternalLink, X } from "lucide-react";

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

export function ShortcutIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#45474D" />
      <path d="M5 9l7-4 7 4v6l-7 4-7-4V9Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5 9l7 4 7-4" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 13v6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ClickupIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M4 22.5l4.5-3.5c1.8 2.3 3.7 3.4 6 3.4 2.3 0 4.1-1.1 5.9-3.3l4.6 3.4C22.3 26 19.3 28 14.5 28 9.8 28 6.6 26 4 22.5Z" fill="#FF3366" />
      <path d="M4 22.5l4.5-3.5c1.8 2.3 3.7 3.4 6 3.4 2.3 0 4.1-1.1 5.9-3.3l4.6 3.4C22.3 26 19.3 28 14.5 28 9.8 28 6.6 26 4 22.5Z" fill="url(#cu_grad)" />
      <path d="M14.5 4L6 12.2l3.2 3.3 5.3-5.2 5.3 5.2 3.2-3.3L14.5 4Z" fill="#7B68EE" />
      <defs>
        <linearGradient id="cu_grad" x1="4" y1="22.5" x2="25" y2="22.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF3366" />
          <stop offset="1" stopColor="#FF9F1C" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function GithubIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  );
}

export function NotionIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#000" />
      <path d="M7 6h6l4 5v7H7V6Z" fill="#fff" opacity=".15" />
      <text x="5" y="17" fontSize="11" fontWeight="bold" fill="#fff" fontFamily="sans-serif">N</text>
    </svg>
  );
}

export function TrelloIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#0079BF" />
      <rect x="4" y="4" width="6" height="13" rx="1.5" fill="#fff" />
      <rect x="14" y="4" width="6" height="8" rx="1.5" fill="#fff" />
    </svg>
  );
}

export function MondayIcon({ size = 13 }: { size?: number }) {
  const r = Math.round(size * 0.18);
  const y = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={size * 0.2} cy={y} r={r} fill="#FF3D57" />
      <circle cx={size * 0.5} cy={y} r={r} fill="#FFCB00" />
      <circle cx={size * 0.8} cy={y} r={r} fill="#00CA72" />
    </svg>
  );
}

export function ZendeskIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#1F73B7" />
      <path d="M12 7a5 5 0 0 1 5 5H7a5 5 0 0 1 5-5Z" fill="#fff" />
      <path d="M7 13h10l-10 4V13Z" fill="#fff" opacity=".7" />
    </svg>
  );
}

export function HubSpotIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#FF5C35" />
      <circle cx="12" cy="9" r="3" fill="#fff" />
      <path d="M9 12v4M15 12v4M6 16h12" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SalesforceIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#00A1E0" />
      <path d="M12 6c-1.66 0-3 1.34-3 3 0 .55.15 1.06.42 1.5C8.56 10.83 8 11.64 8 12.5c0 1.38 1.12 2.5 2.5 2.5H16a2 2 0 0 0 0-4c-.12 0-.24.01-.35.03A3.001 3.001 0 0 0 12 6Z" fill="#fff" />
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
