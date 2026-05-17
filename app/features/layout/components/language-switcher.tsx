import { LOCALE_COOKIE, type Locale, SUPPORTED_LOCALES } from "@lib/i18n";
import { cn } from "@lib/utils";
import { Check, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

// Flag emoji helper — returns the regional indicator emoji for a locale's country
const LOCALE_FLAGS: Record<Locale, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
};

function setLocaleCookie(locale: Locale) {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

interface LanguageSwitcherProps {
  className?: string;
  /** If "icon", only the globe icon is shown (no label). Useful inside compact footers. */
  variant?: "icon" | "full";
}

export function LanguageSwitcher({ className, variant = "full" }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLocale = (i18n.language ?? "en") as Locale;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  function handleSelect(locale: Locale) {
    if (locale === currentLocale) {
      setOpen(false);
      return;
    }
    setLocaleCookie(locale);
    // Full navigation reload so the root loader re-detects the new cookie
    window.location.reload();
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md transition-colors",
          "text-muted-foreground hover:text-foreground hover:bg-muted",
          variant === "full" ? "px-2.5 h-8 text-[12.5px] border border-border" : "p-1.5",
        )}
        aria-label={t("language.changeLanguage")}
        aria-expanded={open}
      >
        <Globe className="h-3.5 w-3.5 shrink-0" />
        {variant === "full" && (
          <>
            <span className="text-[13px]">{LOCALE_FLAGS[currentLocale] ?? "🌐"}</span>
            <span>{t(`language.${currentLocale}`)}</span>
          </>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full mb-1.5 left-0 z-50 min-w-[160px] rounded-lg border border-border bg-background shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-border/60">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              {t("language.label")}
            </p>
          </div>
          <ul className="py-1">
            {SUPPORTED_LOCALES.map((locale) => (
              <li key={locale}>
                <button
                  type="button"
                  onClick={() => handleSelect(locale)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors",
                    locale === currentLocale
                      ? "text-foreground bg-muted/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  )}
                >
                  <span className="text-base leading-none">{LOCALE_FLAGS[locale] ?? "🌐"}</span>
                  <span className="flex-1 text-left">{t(`language.${locale}`)}</span>
                  {locale === currentLocale && (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
