import { MessageSquare } from "lucide-react";
import { Link } from "react-router";

interface AuthLeftPanelProps {
  imageUrl: string;
  quote: string;
  author: string;
}

export function AuthLeftPanel({ imageUrl, quote, author }: AuthLeftPanelProps) {
  return (
    <div
      className="hidden lg:flex w-1/2 flex-col justify-between p-10 relative bg-cover bg-center"
      style={{ backgroundImage: `url('${imageUrl}')` }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <Link to="/" className="relative z-10 flex items-center gap-2 font-semibold text-white">
        <div className="flex size-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm text-white">
          <MessageSquare className="size-4" />
        </div>
        Feeduro
      </Link>

      <blockquote className="relative z-10 space-y-2">
        <p className="text-sm leading-relaxed text-white/90">&ldquo;{quote}&rdquo;</p>
        <footer className="text-sm font-medium text-white/60">— {author}</footer>
      </blockquote>
    </div>
  );
}
