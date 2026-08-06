import { en } from "./en";
import { id } from "./id";
import type { Locale, TranslationKey, TranslationValues } from "./types";

const dictionaries = { en, id } as const;

export function translate(
  locale: Locale,
  key: TranslationKey,
  values?: TranslationValues,
): string {
  const template = dictionaries[locale][key];

  if (!values) {
    return template;
  }

  return Object.entries(values).reduce(
    (result, [name, value]) =>
      result.replaceAll(`{${name}}`, String(value)),
    template,
  );
}
