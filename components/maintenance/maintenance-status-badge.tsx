"use client";

import { useLocalization } from "@/components/localization/localization-provider";
import { StatusBadge } from "@/components/ui/status-badge";
import type { MaintenanceStatus } from "@/lib/data/types";
import type { TranslationKey } from "@/lib/i18n/types";

const statusTones: Record<
  MaintenanceStatus,
  "positive" | "warning" | "danger" | "neutral"
> = {
  open: "warning",
  in_progress: "neutral",
  completed: "positive",
  cancelled: "danger",
};

const statusTranslationKeys: Record<MaintenanceStatus, TranslationKey> = {
  open: "common.status.open",
  in_progress: "common.status.inProgress",
  completed: "common.status.completed",
  cancelled: "common.status.cancelled",
};

export function MaintenanceStatusBadge({
  status,
}: {
  status: MaintenanceStatus;
}) {
  const { t } = useLocalization();

  return (
    <StatusBadge tone={statusTones[status]}>
      {t(statusTranslationKeys[status])}
    </StatusBadge>
  );
}
