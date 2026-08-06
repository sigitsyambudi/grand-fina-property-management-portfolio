"use client";

import { useLocalization } from "@/components/localization/localization-provider";

export default function WorkspaceLoading() {
  const { t } = useLocalization();

  return (
    <div
      role="status"
      aria-label={t("workspace.loading")}
      className="space-y-6"
    >
      <div className="h-16 animate-pulse bg-white" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse border border-[var(--border)] bg-white"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse border border-[var(--border)] bg-white" />
      <span className="sr-only">{t("workspace.loading")}</span>
    </div>
  );
}
