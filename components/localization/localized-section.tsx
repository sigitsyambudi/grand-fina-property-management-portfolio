"use client";

import type { ReactNode } from "react";
import type { TranslationKey } from "@/lib/i18n/types";
import { useLocalization } from "./localization-provider";

export function LocalizedSection({
  ariaLabelKey,
  children,
  className,
}: {
  ariaLabelKey: TranslationKey;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useLocalization();

  return (
    <section aria-label={t(ariaLabelKey)} className={className}>
      {children}
    </section>
  );
}
