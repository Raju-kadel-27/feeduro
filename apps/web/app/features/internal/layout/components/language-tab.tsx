import { LOCALE_COOKIE, type Locale, SUPPORTED_LOCALES } from "@lib/i18n";
import { cn } from "@lib/utils";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

const LOCALE_META: Record<Locale, { flag: string; native: string; region: string }> = {
  en: { flag: "🇺🇸", native: "English", region: "United States" },
  es: { flag: "🇪🇸", native: "Español", region: "Spain" },
};

function setLocaleCookie(locale: Locale) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function LanguageTab() {
  const { i18n } = useTranslation();
  const currentLocale = (i18n.language ?? "en") as Locale;

  function handleSelect(locale: Locale) {
    if (locale === currentLocale) return;
    setLocaleCookie(locale);
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[17px] font-semibold">Language</h2>
        <p className="text-[14px] text-muted-foreground mt-0.5">
          Choose the language you'd like to use in Feeduro.
        </p>
      </div>

      <div>
        <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
          Display Language
        </p>
        <div className="grid grid-cols-2 gap-3">
          {SUPPORTED_LOCALES.map((locale) => {
            const meta = LOCALE_META[locale];
            const active = locale === currentLocale;
            return (
              <button
                key={locale}
                type="button"
                onClick={() => handleSelect(locale)}
                aria-pressed={active}
                className={cn(
                  "relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all text-center",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-foreground/20 hover:bg-muted/40",
                )}
              >
                {active && (
                  <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                    <Check className="h-2.5 w-2.5 text-primary-foreground" />
                  </span>
                )}
                <span className="text-4xl leading-none" role="img" aria-label={meta.native}>
                  {meta.flag}
                </span>
                <div className="space-y-0.5">
                  <p className="text-[14.5px] font-semibold leading-tight">{meta.native}</p>
                  <p className="text-[12px] text-muted-foreground">{meta.region}</p>
                </div>
                {active && (
                  <span className="text-[11px] text-primary font-medium">Active</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
