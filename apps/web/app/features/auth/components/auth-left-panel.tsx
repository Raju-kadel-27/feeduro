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

      <div className="relative z-10 flex flex-col items-center text-center gap-5">
        <div className="w-20 h-20 rounded-full border border-white/10 overflow-hidden shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={author} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/[0.06] flex items-center justify-center">
              <span className="text-lg font-medium tracking-wide text-white/35">
                {avatarInitials}
              </span>
            </div>
          )}
        </div>

        <blockquote className="space-y-3 max-w-xs">
          <p className="text-[15px] leading-relaxed text-white/80">
            &ldquo;{quote}&rdquo;
          </p>
          <footer>
            <p className="text-sm font-semibold text-white/70">{author}</p>
            <p className="text-xs text-white/35 mt-0.5">{authorTitle}</p>
          </footer>
        </blockquote>
      </div>

      <div className="relative z-10 space-y-4">
        <p className="text-center text-[10px] uppercase tracking-[0.15em] text-white/20">
          Trusted by teams at
        </p>
        <div className="grid grid-cols-3 gap-x-4 gap-y-3">
          {placeholderLogos.map((name) => (
            <div
              key={name}
              className="flex items-center justify-center py-1.5 rounded border border-white/[0.06]"
            >
              <span className="text-xs font-semibold tracking-wide text-white/20">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
