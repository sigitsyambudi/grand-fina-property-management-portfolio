"use client";

import { formatMaintenanceCategory } from "@/components/maintenance/maintenance-formatters";
import { useLocalization } from "@/components/localization/localization-provider";
import type { MaintenanceCategory } from "@/lib/data/types";

export function MaintenanceCategoryBadge({
  category,
}: {
  category: MaintenanceCategory;
}) {
  const { locale } = useLocalization();

  return (
    <span className="inline-flex items-center rounded bg-[#edf0ee] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#4f5d57]">
      {formatMaintenanceCategory(category, locale)}
    </span>
  );
}
