"use client";

import { useLocalization } from "@/components/localization/localization-provider";
import type { RoomStatus } from "@/lib/data/types";
import type { TranslationKey } from "@/lib/i18n/types";

const statusStyles: Record<RoomStatus, string> = {
  Occupied: "border-[#cfe0d8] bg-[#e7f2ec] text-[#285f49]",
  Available: "border-[#d6e5ca] bg-[#edf5e8] text-[#3f6d32]",
  Maintenance: "border-[#ead9b8] bg-[#f6eddd] text-[#815d22]",
};

const statusDots: Record<RoomStatus, string> = {
  Occupied: "bg-[#3f8667]",
  Available: "bg-[#6d9b55]",
  Maintenance: "bg-[#b08a4a]",
};

const statusTranslationKeys: Record<RoomStatus, TranslationKey> = {
  Occupied: "common.status.occupied",
  Available: "common.status.available",
  Maintenance: "common.status.maintenance",
};

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  const { t } = useLocalization();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.07em] ${statusStyles[status]}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${statusDots[status]}`}
      />
      {t(statusTranslationKeys[status])}
    </span>
  );
}
