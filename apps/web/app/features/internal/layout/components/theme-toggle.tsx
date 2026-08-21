import { cn } from "@lib/utils";
import { useTheme } from "@providers/theme-provider";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle({ className, large }: { className?: string; large?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark =
    mounted &&
    (theme === "dark" ||
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex items-center justify-center rounded-md transition-colors",
        large ? "p-2 text-base" : "p-1.5 text-sm",
        "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        className,
      )}
      aria-label="Toggle theme"
    >
      {isDark
        ? <Sun className={large ? "h-5 w-5" : "h-4 w-4"} />
        : <Moon className={large ? "h-5 w-5" : "h-4 w-4"} />}
    </button>
  );
}
