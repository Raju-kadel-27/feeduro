import { cn } from "@lib/utils";
import { Bell } from "lucide-react";
import { NavLink } from "react-router";
import { toast } from "sonner";
import type { SessionUser } from "../../schemas/public";
import { UserMenu } from "./user-menu";

const TABS = [
  { id: "feedback", label: "Feedback" },
  { id: "roadmap", label: "Roadmap" },
  { id: "updates", label: "Changelogs" },
] as const;

export function PortalTopNav({
  orgName,
  orgLogo,
  tabBasePath,
  sessionUser,
  onSubmitPost,
  onSignIn,
  onSignUp,
}: {
  orgName: string;
  orgLogo?: string | null;
  /** Base path for tab links. "/:orgSlug/portal" for slug routes, "/portal" for subdomains. */
  tabBasePath: string;
  sessionUser: SessionUser | null;
  onSubmitPost: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b border-border/60">
      <div className="mx-auto flex h-11 max-w-[1440px] items-center px-6">
        <div className="w-[520px] shrink-0 flex items-center">
          <a href="/" className="flex items-center gap-2.5">
            {orgLogo ? (
              <img src={orgLogo} alt={orgName} className="h-7 w-7 rounded-md object-cover" />
            ) : (
              <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground text-[14px] font-bold">
                {orgName[0]?.toUpperCase() ?? "?"}
              </span>
            )}
            <span className="text-[16px] font-semibold tracking-tight">{orgName}</span>
          </a>
        </div>

        <nav className="flex flex-1 items-center gap-1">
          {TABS.map((tab) => (
            <NavLink
              key={tab.id}
              to={`${tabBasePath}/${tab.id}`}
              prefetch="intent"
              end
              className={({ isActive }) =>
                cn(
                  "relative px-3 h-11 text-[17px] inline-flex items-center transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {tab.label}
                  {isActive && (
                    <span className="absolute left-3 right-3 bottom-0 h-px bg-primary" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              toast("Coming soon", { description: "Notifications are not available yet." })
            }
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>

          {sessionUser ? (
            <UserMenu user={sessionUser} onSubmitPost={onSubmitPost} />
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSignIn}
                className="px-3 h-8 rounded-md border border-border text-[14.5px] font-medium text-foreground/80 hover:text-foreground hover:bg-muted transition-colors inline-flex items-center"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={onSignUp}
                className="px-3 h-8 rounded-md bg-primary text-primary-foreground text-[14.5px] font-medium hover:bg-primary/90 transition-colors inline-flex items-center"
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
