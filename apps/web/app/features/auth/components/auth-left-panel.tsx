import { FEEDURO_LOGO_URL } from "@utils/brand";
import { Star } from "lucide-react";
import { Link } from "react-router";

const AVATAR_PHOTOS = [
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/women/68.jpg",
  "https://randomuser.me/api/portraits/men/75.jpg",
  "https://randomuser.me/api/portraits/women/90.jpg",
];

export function AuthLeftPanel() {
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
        <img
          src={FEEDURO_LOGO_URL}
          alt="Feeduro"
          className="size-7 rounded-lg"
        />
        Feeduro
      </Link>

      <div className="relative z-10 max-w-lg space-y-4">
        <h2 className="text-5xl font-semibold tracking-tight text-white leading-tight">
          Feedback that actually gets shipped.
        </h2>
        <p className="text-base text-white/45 leading-relaxed">
          Your customers are already telling you what they want. Feeduro helps you collect
          feedback, find what matters, and turn it into what you build next.
        </p>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-yellow-400/70">
          <li>Collect feedback</li>
          <li className="text-yellow-400/30">·</li>
          <li>Prioritize requests</li>
          <li className="text-yellow-400/30">·</li>
          <li>Ship with confidence</li>
        </ul>
      </div>

      <div className="relative z-10 border-t border-white/[0.08] pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {AVATAR_PHOTOS.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                className="w-8 h-8 rounded-full border-2 border-[#111214] object-cover"
              />
            ))}
          </div>
          <div className="w-px h-7 bg-white/10" />
          <div className="flex flex-col gap-0.5">
            <div className="flex gap-px">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-sm text-white/40">
              Join{" "}
              <strong className="text-white/70 font-semibold">50+ product teams</strong>
            </p>
          </div>
        </div>
        <p className="text-sm text-white/30">Simple, private, and built for modern product teams.</p>
      </div>
    </div>
  );
}
