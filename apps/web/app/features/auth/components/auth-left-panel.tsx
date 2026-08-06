import { MessageSquare } from "lucide-react";
import { Link } from "react-router";

interface AuthLeftPanelProps {
  quote: string;
  author: string;
  authorTitle: string;
  avatarInitials: string;
  avatarUrl?: string;
}

const placeholderLogos = ["Orbit", "Launchpad", "Nexus", "Foundry", "Meridian", "Arcane"];

export function AuthLeftPanel({
  quote,
  author,
  authorTitle,
  avatarInitials,
  avatarUrl,
}: AuthLeftPanelProps) {
  return (
    <div className="hidden lg:flex w-1/2 flex-col justify-between p-10 relative bg-[#111214] overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(255 255 255 / 0.03)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e\")",
        }}
      />

      <Link to="/" className="relative z-10 flex items-center gap-2 font-semibold text-white">
        <div className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white">
          <MessageSquare className="size-4" />
        </div>
        Feeduro
      </Link>

      <div className="relative z-10 flex flex-col items-center text-center gap-6">
        <div className="w-24 h-24 rounded-full border border-white/10 overflow-hidden shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={author} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/[0.06] flex items-center justify-center">
              <span className="text-xl font-medium tracking-wide text-white/40">
                {avatarInitials}
              </span>
            </div>
          )}
        </div>

        <blockquote className="space-y-4 max-w-sm">
          <p className="text-[17px] leading-[1.75] text-white/85">
            &ldquo;{quote}&rdquo;
          </p>
          <footer>
            <p className="text-sm font-semibold text-white/75">{author}</p>
            <p className="text-xs text-white/45 mt-1">{authorTitle}</p>
          </footer>
        </blockquote>
      </div>

      <div className="relative z-10 border-t border-white/[0.08] pt-6 space-y-4">
        <p className="text-center text-[10px] uppercase tracking-[0.14em] text-white/35">
          Trusted by teams at
        </p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {placeholderLogos.map((name) => (
            <span key={name} className="text-sm font-medium text-white/45">
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
