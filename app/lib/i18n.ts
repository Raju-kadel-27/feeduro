import { createInstance, type i18n } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";
import es from "../locales/es.json";

// ─── Config ───────────────────────────────────────────────────────────────────

export const SUPPORTED_LOCALES = ["en", "es"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

// All translation resources bundled inline — no async file I/O, edge-runtime safe
const resources = {
  en: { translation: en },
  es: { translation: es },
} satisfies Record<Locale, { translation: unknown }>;

// ─── Instance factory ─────────────────────────────────────────────────────────
// Creates a fresh i18next instance per call.
// On the server: called once per SSR render (React tree is new per request).
// On the client: called once at hydration, then changeLanguage() is used.

export function createI18nInstance(locale: string = DEFAULT_LOCALE): i18n {
  const instance = createInstance();

  // init() is synchronous when no async plugins are used — safe for SSR
  instance.use(initReactI18next).init({
    resources,
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    defaultNS: "translation",
    ns: ["translation"],
  });

  return instance;
}

// ─── Locale detection ─────────────────────────────────────────────────────────
// Priority: locale cookie → Accept-Language header → default

export function detectLocale(request: Request): Locale {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)locale=([^;]+)/);
  const cookieLocale = match?.[1]?.trim();

  if (cookieLocale && (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale)) {
    return cookieLocale as Locale;
  }

  const acceptLang = request.headers.get("Accept-Language") ?? "";
  for (const part of acceptLang.split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase();
    if ((SUPPORTED_LOCALES as readonly string[]).includes(tag)) return tag as Locale;
    const short = tag.split("-")[0];
    if ((SUPPORTED_LOCALES as readonly string[]).includes(short)) return short as Locale;
  }

  return DEFAULT_LOCALE;
}
