import { Star } from "lucide-react";
import { Link } from "react-router";

interface PlanBannerProps {
  children: React.ReactNode;
  upgradeTo?: string;
}

export function PlanBanner({ children, upgradeTo }: PlanBannerProps) {
  return (
    <div className={`rounded-lg border border-orange-200 bg-orange-50 px-5 py-4 dark:border-orange-900/50 dark:bg-orange-900/20${upgradeTo ? " flex items-center justify-between gap-4" : ""}`}>
      <p className="text-base text-orange-800 dark:text-orange-300">{children}</p>
      {upgradeTo && (
        <Link
          to={upgradeTo}
          className="shrink-0 flex items-center gap-1 text-sm font-semibold text-orange-700 hover:text-orange-900 transition-colors dark:text-orange-400 dark:hover:text-orange-200"
        >
          Upgrade <Star size={13} className="fill-amber-400 text-amber-400" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
