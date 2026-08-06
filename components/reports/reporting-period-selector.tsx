"use client";

import { formatBillingPeriod } from "@/components/invoices/invoice-formatters";
import { useLocalization } from "@/components/localization/localization-provider";

export function ReportingPeriodSelector({
  action,
  periods,
  selectedPeriod,
}: {
  action: "/" | "/reports";
  periods: readonly string[];
  selectedPeriod: string;
}) {
  const { locale, t } = useLocalization();
  const options = periods.length > 0 ? periods : [selectedPeriod];

  return (
    <form
      action={action}
      className="flex w-full flex-wrap items-end gap-2 rounded-md border border-[var(--border)] border-l-2 border-l-[var(--accent)] bg-[var(--surface-subtle)] px-4 py-3 sm:w-auto"
    >
      <label className="grid gap-1" htmlFor={`reporting-period-${action}`}>
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          {t("reports.reportingPeriod")}
        </span>
        <select
          id={`reporting-period-${action}`}
          name="period"
          defaultValue={selectedPeriod}
          className="min-h-9 rounded-md border border-[var(--border-strong)] bg-white px-2.5 text-sm font-semibold text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
        >
          {options.map((period) => (
            <option key={period} value={period}>
              {formatBillingPeriod(period, locale)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="min-h-9 rounded-md bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
      >
        {t("reports.applyPeriod")}
      </button>
    </form>
  );
}
