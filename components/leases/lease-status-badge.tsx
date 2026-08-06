"use client";

import { useLocalization } from "@/components/localization/localization-provider";
import { StatusBadge } from "@/components/ui/status-badge";
import type { LeaseStatus } from "@/lib/data/types";
import type { TranslationKey } from "@/lib/i18n/types";

const statusTranslationKeys: Record<LeaseStatus, TranslationKey> = {
  active: "common.status.active",
  upcoming: "common.status.upcoming",
  ended: "common.status.ended",
};

export function LeaseStatusBadge({ status }: { status: LeaseStatus }) {
  const { t } = useLocalization();
  const tone =
    status === "active"
      ? "positive"
      : status === "upcoming"
        ? "warning"
        : "neutral";

  return <StatusBadge tone={tone}>{t(statusTranslationKeys[status])}</StatusBadge>;
}
