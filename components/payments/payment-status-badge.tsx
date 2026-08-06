"use client";

import { useLocalization } from "@/components/localization/localization-provider";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PaymentStatus } from "@/lib/data/types";
import type { TranslationKey } from "@/lib/i18n/types";

const statusTranslationKeys: Record<PaymentStatus, TranslationKey> = {
  completed: "common.status.completed",
  pending: "common.status.pending",
  reversed: "common.status.reversed",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { t } = useLocalization();
  const tone =
    status === "completed"
      ? "positive"
      : status === "pending"
        ? "warning"
        : "danger";

  return <StatusBadge tone={tone}>{t(statusTranslationKeys[status])}</StatusBadge>;
}
