"use client";

import { useLocalization } from "@/components/localization/localization-provider";
import type { TenantStatus } from "@/lib/data/types";
import type { TranslationKey } from "@/lib/i18n/types";

const statusStyles: Record<TenantStatus, string> = {
  active: "border-[#cfe0d8] bg-[#e7f2ec] text-[#285f49]",
  former: "border-[#d9dddb] bg-[#edf0ee] text-[#59645f]",
  pending: "border-[#ead9b8] bg-[#f6eddd] text-[#815d22]",
};

const statusDots: Record<TenantStatus, string> = {
  active: "bg-[#3f8667]",
  former: "bg-[#87918c]",
  pending: "bg-[#b08a4a]",
};

const statusTranslationKeys: Record<TenantStatus, TranslationKey> = {
  active: "common.status.active",
  former: "common.status.former",
  pending: "common.status.pending",
};

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
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
