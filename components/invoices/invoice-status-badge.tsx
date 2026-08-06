"use client";

import { useLocalization } from "@/components/localization/localization-provider";
import { StatusBadge } from "@/components/ui/status-badge";
import type { InvoiceStatus } from "@/lib/data/types";
import type { TranslationKey } from "@/lib/i18n/types";

const statusTranslationKeys: Record<InvoiceStatus, TranslationKey> = {
  draft: "common.status.draft",
  issued: "common.status.issued",
  partially_paid: "common.status.partial",
  paid: "common.status.paid",
  overdue: "common.status.overdue",
  void: "common.status.void",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { t } = useLocalization();
  const tone =
    status === "paid"
      ? "positive"
      : status === "partially_paid"
        ? "warning"
        : status === "overdue" || status === "void"
          ? "danger"
          : "neutral";

  return (
    <StatusBadge tone={tone}>{t(statusTranslationKeys[status])}</StatusBadge>
  );
}
