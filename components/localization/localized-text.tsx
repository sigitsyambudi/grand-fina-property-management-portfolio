"use client";

import { useLocalization } from "./localization-provider";
import type {
  TranslationKey,
  TranslationValues,
} from "@/lib/i18n/types";

export function LocalizedText({
  translationKey,
  values,
}: {
  translationKey: TranslationKey;
  values?: TranslationValues;
}) {
  const { t } = useLocalization();

  return t(translationKey, values);
}
