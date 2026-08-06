"use client";

import { useLocalization } from "@/components/localization/localization-provider";

export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLocalization();

  return (
    <section
      role="alert"
      className="border border-[#d8c7b2] bg-white p-6 sm:p-8"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--danger)]">
        {t("workspace.errorEyebrow")}
      </p>
      <h1 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
        {t("workspace.errorTitle")}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
        {t("workspace.errorDescription")}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex min-h-10 items-center rounded-md bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[var(--brand-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
      >
        {t("workspace.retry")}
      </button>
    </section>
  );
}
