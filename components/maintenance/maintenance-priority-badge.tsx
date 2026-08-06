"use client";

import { useLocalization } from "@/components/localization/localization-provider";
import type { MaintenancePriority } from "@/lib/data/types";
import type { TranslationKey } from "@/lib/i18n/types";

const priorityClasses: Record<MaintenancePriority, string> = {
  low: "bg-[#edf0ee] text-[#59645f]",
  medium: "bg-[#f6eddd] text-[#815d22]",
  high: "bg-[#f5e9de] text-[#8a4e27]",
  urgent: "bg-[#983d38] text-white",
};

const priorityTranslationKeys: Record<MaintenancePriority, TranslationKey> = {
  low: "common.priority.low",
  medium: "common.priority.medium",
  high: "common.priority.high",
  urgent: "common.priority.urgent",
};

export function MaintenancePriorityBadge({
  priority,
}: {
  priority: MaintenancePriority;
}) {
  const { t } = useLocalization();

  return (
    <span
      className={`inline-flex items-center rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${priorityClasses[priority]}`}
    >
      {t(priorityTranslationKeys[priority])}
    </span>
  );
}
