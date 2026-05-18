export function AsanaIcon({ size = 20 }: { size?: number }) {
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

export function JiraIcon({ size = 20 }: { size?: number }) {
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

export function LinearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden fill="currentColor">
      <path d="M1.22 61.08 38.92 98.78a50.08 50.08 0 0 1-37.7-37.7ZM0 49.08l50.92 50.92A50 50 0 0 1 0 49.08ZM10.08 15.5 84.5 89.92A50 50 0 0 1 10.08 15.5ZM17.83 8.55l73.62 73.62A50 50 0 0 1 17.83 8.55ZM30.92 2.5 97.5 69.08A50 50 0 0 1 30.92 2.5ZM49.92 0a50.08 50.08 0 0 1 50.08 49.92L49.92 0Z" />
    </svg>
  );
}

export function SlackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#E01E5A"
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z"
      />
      <path
        fill="#E01E5A"
        d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
      />
      <path
        fill="#36C5F0"
        d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z"
      />
      <path
        fill="#36C5F0"
        d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
      />
      <path
        fill="#2EB67D"
        d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z"
      />
      <path
        fill="#2EB67D"
        d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
      />
      <path
        fill="#ECB22E"
        d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z"
      />
      <path
        fill="#ECB22E"
        d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
      />
    </svg>
  );
}

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "size-4"} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function NotionIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <rect width="100" height="100" rx="18" fill="#000" />
      <path
        d="M22 22 L22 78 L36 78 L36 44 L64 78 L78 78 L78 22 L64 22 L64 56 L36 22 Z"
        fill="white"
      />
    </svg>
  );
}

export function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-foreground" aria-hidden>
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.31.468-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.51 11.51 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export function TrelloIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="3" fill="#0052CC" />
      <rect x="3" y="3" width="5.5" height="12" rx="1.5" fill="white" />
      <rect x="11.5" y="3" width="5.5" height="8" rx="1.5" fill="white" />
    </svg>
  );
}

export function MondayIcon({ size = 20 }: { size?: number }) {
  const r = Math.round(size * 0.175);
  const y = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={size * 0.2} cy={y} r={r} fill="#FF3D57" />
      <circle cx={size * 0.5} cy={y} r={r} fill="#FFCB00" />
      <circle cx={size * 0.8} cy={y} r={r} fill="#00CA72" />
    </svg>
  );
}

export function SalesforceIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#00A1E0" />
      <path
        d="M11.8 18.5a3.2 3.2 0 0 1-3.2-3.2 3.2 3.2 0 0 1 3.2-3.2c.28 0 .55.04.8.1A3.8 3.8 0 0 1 15.8 10a3.8 3.8 0 0 1 3.8 3.8c0 .07 0 .14-.01.21A2.6 2.6 0 0 1 21 16.4a2.6 2.6 0 0 1-2.6 2.6H11.8Z"
        fill="white"
      />
    </svg>
  );
}

export function HubSpotIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#FF7A59" />
      <circle cx="17.5" cy="10.5" r="2.5" fill="white" />
      <path
        d="M17.5 13v2.5M17.5 8V5.5M14.5 10.5H12M20.5 10.5H23M15.7 8.7 14 7M19.3 12.3 21 14"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M14.5 16.5C14.5 15.12 13.38 14 12 14H9.5A2.5 2.5 0 0 0 7 16.5v.5a2.5 2.5 0 0 0 2.5 2.5H12c1.38 0 2.5-1.12 2.5-2.5v-.5Z"
        fill="white"
      />
    </svg>
  );
}

export function ZendeskIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#03363D" />
      <path d="M14 7a5 5 0 0 1 5 5v.5H9V12a5 5 0 0 1 5-5zM9 14h10l-5 7-5-7z" fill="white" />
    </svg>
  );
}

export function N8nIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#EA4B71" />
      <path
        d="M7 10.5C7 9.12 8.12 8 9.5 8S12 9.12 12 10.5c0 .9-.48 1.68-1.2 2.12L14 17.5l3.2-4.88A2.497 2.497 0 0 1 16 10.5C16 9.12 17.12 8 18.5 8S21 9.12 21 10.5 19.88 13 18.5 13c-.18 0-.35-.02-.52-.06L14 19.5l-3.98-6.56c-.17.04-.34.06-.52.06C8.12 13 7 11.88 7 10.5Z"
        fill="white"
      />
    </svg>
  );
}

export function ZapierIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#FF4A00" />
      <path d="M15.5 4L7 15h6.5l-3 9L19.5 13H13l2.5-9z" fill="white" />
    </svg>
  );
}

export function ShortcutIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="6" fill="#6515DD" />
      <path
        d="M9 11.5C9 10.12 10.12 9 11.5 9H17a4.5 4.5 0 0 1 0 9h-1.5l3.5 5H16l-3.5-5H11.5A2.5 2.5 0 0 1 9 15.5v-4ZM11.5 11a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5H17a2.5 2.5 0 0 0 0-5h-5.5Z"
        fill="white"
      />
    </svg>
  );
}

export function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#5865F2]" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
