import { cn } from "@lib/utils";
import { Search } from "lucide-react";
import { Link } from "react-router";
import type { PublicTab, SessionUser } from "../schemas/public";
import { UserMenu } from "./user-menu";

export function TopNav({
  orgName,
  sessionUser,
  currentTab,
  onSubmitPost,
  onSignIn,
  onSignUp,
}: {
  orgName: string;
  sessionUser: SessionUser | null;
  currentTab: PublicTab;
  onSubmitPost: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b border-border/60">
      <div className="mx-auto flex h-11 max-w-[1440px] items-center px-6">
        <div className="w-[520px] shrink-0 flex items-center">
          <a href="/" className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background text-[12px] font-bold">
              {orgName[0]?.toUpperCase() ?? "?"}
            </span>
            <span className="text-[14px] font-semibold tracking-tight">{orgName}</span>
          </a>
        </div>

        <nav className="flex flex-1 items-center gap-1">
          {(["feedback", "roadmap", "updates"] as const).map((tab) => (
            <Link
              key={tab}
              to={tab === "feedback" ? "?" : `?tab=${tab}`}
              className={cn(
                "relative px-3 h-11 text-[15px] inline-flex items-center capitalize transition-colors",
                currentTab === tab
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab === "updates" ? "Changelogs" : tab}
              {currentTab === tab && (
                <span className="absolute left-3 right-3 bottom-0 h-px bg-foreground" />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder="Search..."
              className="h-8 w-[220px] rounded-md border border-border bg-card/60 pl-8 pr-10 text-[12.5px] placeholder:text-muted-foreground focus:outline-none"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 select-none items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
              /
            </kbd>
          </div>

          {sessionUser ? (
            <UserMenu user={sessionUser} onSubmitPost={onSubmitPost} />
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onSignIn}
                className="px-3 h-8 rounded-md border border-border text-[12.5px] font-medium text-foreground/80 hover:text-foreground hover:bg-muted transition-colors inline-flex items-center"
              >
                Sign in
              </button>
              <button
                onClick={onSignUp}
                className="px-3 h-8 rounded-md bg-primary text-primary-foreground text-[12.5px] font-medium hover:bg-primary/90 transition-colors inline-flex items-center"
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
