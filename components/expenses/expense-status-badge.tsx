"use client";

import { useLocalization } from "@/components/localization/localization-provider";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ExpenseStatus } from "@/lib/data/types";
import type { TranslationKey } from "@/lib/i18n/types";

const statusPresentation: Record<
  ExpenseStatus,
  { labelKey: TranslationKey; tone: "positive" | "warning" | "danger" }
> = {
  recorded: { labelKey: "common.status.recorded", tone: "positive" },
  pending: { labelKey: "common.status.pending", tone: "warning" },
  void: { labelKey: "common.status.void", tone: "danger" },
};

export function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  const { t } = useLocalization();
  const presentation = statusPresentation[status];

  return (
    <StatusBadge tone={presentation.tone}>
      {t(presentation.labelKey)}
    </StatusBadge>
  );
}
