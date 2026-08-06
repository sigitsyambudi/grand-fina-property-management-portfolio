"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { translate } from "@/lib/i18n/dictionaries";
import {
  DEFAULT_LOCALE,
  isLocale,
  LANGUAGE_STORAGE_KEY,
  type Locale,
  type TranslationKey,
  type TranslationValues,
} from "@/lib/i18n/types";

type LocalizationContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
};

const LocalizationContext = createContext<LocalizationContextValue | null>(null);
const LOCALE_CHANGE_EVENT = "grand-fina-locale-change";

function getLocaleSnapshot(): Locale {
  const storedLocale = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isLocale(storedLocale) ? storedLocale : DEFAULT_LOCALE;
}

function subscribeToLocale(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(LOCALE_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(LOCALE_CHANGE_EVENT, onStoreChange);
  };
}

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeToLocale,
    getLocaleSnapshot,
    () => DEFAULT_LOCALE,
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLocale);
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
  }, []);

  const value = useMemo<LocalizationContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, values) => translate(locale, key, values),
    }),
    [locale, setLocale],
  );

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization(): LocalizationContextValue {
  const context = useContext(LocalizationContext);

  if (!context) {
    throw new Error(
      "useLocalization must be used within LocalizationProvider.",
    );
  }

  return context;
}
