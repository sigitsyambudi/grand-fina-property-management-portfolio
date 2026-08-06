import { en } from "./en";

export const supportedLocales = ["id", "en"] as const;

export type Locale = (typeof supportedLocales)[number];
export type TranslationKey = keyof typeof en;
export type TranslationValues = Readonly<Record<string, string | number>>;

export const DEFAULT_LOCALE: Locale = "id";
export const LANGUAGE_STORAGE_KEY = "grand-fina-locale";

export function isLocale(value: string | null): value is Locale {
  return value === "id" || value === "en";
}
