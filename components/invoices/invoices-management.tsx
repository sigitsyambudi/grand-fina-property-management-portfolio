"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocalization } from "@/components/localization/localization-provider";
import { EmptyState } from "@/components/ui/empty-state";
import {
  filterInvoiceRecords,
  type InvoiceListRecord,
  type InvoiceStatusFilter,
} from "@/components/invoices/invoice-filter";
import { formatBillingPeriod } from "@/components/invoices/invoice-formatters";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import {
  InvoiceCreatePanel,
  type BillableLeaseOption,
} from "@/components/invoices/invoice-write-panels";
import { formatIdr, formatRoomDate } from "@/components/rooms/room-formatters";
import type { TranslationKey } from "@/lib/i18n/types";

const statusOptions: readonly {
  value: InvoiceStatusFilter;
  labelKey: TranslationKey;
}[] = [
  { value: "all", labelKey: "common.all" },
  { value: "paid", labelKey: "common.status.paid" },
  { value: "issued", labelKey: "common.status.issued" },
  { value: "partially_paid", labelKey: "common.status.partial" },
  { value: "overdue", labelKey: "common.status.overdue" },
];

function isInvoiceStatusFilter(
  value: string | null,
): value is InvoiceStatusFilter {
  return statusOptions.some((option) => option.value === value);
}

function InvoiceSummary({
  records,
}: {
  records: readonly InvoiceListRecord[];
}) {
  const { t } = useLocalization();
  const metrics = [
    {
      label: t("invoices.total"),
      value: records.length.toString(),
      detail: t("invoices.summaryAllPeriods"),
    },
    {
      label: t("common.totalBilled"),
      value: formatIdr(
        records.reduce((sum, invoice) => sum + invoice.amount, 0),
      ),
      detail: t("invoices.summarySnapshots"),
    },
    {
      label: t("invoices.paid"),
      value: records
        .filter((invoice) => invoice.status === "paid")
        .length.toString(),
      detail: t("invoices.summaryPaymentDerived"),
    },
    {
      label: t("invoices.balance"),
      value: formatIdr(
        records.reduce((sum, invoice) => sum + invoice.balance, 0),
      ),
      detail: t("invoices.summaryBalanceDerived"),
    },
  ];

  return (
    <section
      aria-label={t("invoices.title")}
      className="grid grid-cols-2 border border-[var(--border)] bg-white lg:grid-cols-4"
    >
      {metrics.map((metric, index) => (
        <div
          key={metric.label}
          className={`p-4 sm:p-5 ${
            index < 2 ? "border-b border-[var(--border)] lg:border-b-0" : ""
          } ${index % 2 === 0 ? "border-r border-[var(--border)]" : ""} ${
            index === 1 || index === 2 ? "lg:border-r" : ""
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            {metric.label}
          </p>
          <p className="mt-2 text-base font-semibold tabular-nums text-[var(--foreground)] sm:text-lg">
            {metric.value}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
            {metric.detail}
          </p>
        </div>
      ))}
    </section>
  );
}

function DesktopInvoiceTable({
  records,
}: {
  records: readonly InvoiceListRecord[];
}) {
  const { locale, t } = useLocalization();

  return (
    <div className="hidden overflow-hidden border border-[var(--border)] bg-white xl:block">
      <table className="w-full border-collapse text-left">
        <thead className="bg-[#f4f1ea]">
          <tr className="border-b border-[var(--border)]">
            {[
              t("invoices.title"),
              t("common.tenant"),
              t("common.room"),
              t("common.billingPeriod"),
              t("common.amount"),
              t("common.status.paid"),
              t("invoices.remaining"),
              t("common.dueDate"),
              t("common.status"),
              "",
            ].map((heading) => (
              <th
                key={heading || "actions"}
                scope="col"
                className="px-3 py-3 text-[9px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {records.map((invoice) => (
            <tr key={invoice.id} className="hover:bg-[#fbfaf7]">
              <td className="px-3 py-4 text-[11px] font-semibold">
                {invoice.reference}
              </td>
              <td className="px-3 py-4 text-[11px] font-medium">
                {invoice.tenant.fullName}
              </td>
              <td className="px-3 py-4 text-[11px] font-semibold">
                {invoice.room.roomNumber}
              </td>
              <td className="px-3 py-4 text-[11px] text-[var(--muted)]">
                {formatBillingPeriod(invoice.billingPeriod, locale)}
              </td>
              <td className="px-3 py-4 text-[11px] font-semibold tabular-nums">
                {formatIdr(invoice.amount)}
              </td>
              <td className="px-3 py-4 text-[11px] tabular-nums text-[var(--muted)]">
                {formatIdr(invoice.paidAmount)}
              </td>
              <td className="px-3 py-4 text-[11px] font-semibold tabular-nums">
                {formatIdr(invoice.balance)}
              </td>
              <td className="px-3 py-4 text-[11px] text-[var(--muted)]">
                {formatRoomDate(invoice.dueDate, locale)}
              </td>
              <td className="px-3 py-4">
                <InvoiceStatusBadge status={invoice.status} />
              </td>
              <td className="px-3 py-4 text-right">
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="inline-flex min-h-9 items-center rounded-md border border-[var(--border)] px-3 text-[11px] font-semibold text-[var(--brand)] hover:border-[#b6c4be] hover:bg-[var(--brand-soft)]"
                >
                  {t("common.viewDetails")}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileInvoiceList({
  records,
}: {
  records: readonly InvoiceListRecord[];
}) {
  const { locale, t } = useLocalization();

  return (
    <div className="space-y-3 xl:hidden">
      {records.map((invoice) => (
        <article
          key={invoice.id}
          className="border border-[var(--border)] bg-white p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                {invoice.reference}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {invoice.tenant.fullName}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {t("common.roomNumber", { number: invoice.room.roomNumber })}
              </p>
            </div>
            <InvoiceStatusBadge status={invoice.status} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-[var(--border)] py-4">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("common.amount")}
              </dt>
              <dd className="mt-1 text-xs font-semibold tabular-nums">
                {formatIdr(invoice.amount)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("invoices.remaining")}
              </dt>
              <dd className="mt-1 text-xs font-semibold tabular-nums">
                {formatIdr(invoice.balance)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("common.dueDate")}
              </dt>
              <dd className="mt-1 text-xs font-medium">
                {formatRoomDate(invoice.dueDate, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("common.billingPeriod")}
              </dt>
              <dd className="mt-1 text-xs font-medium">
                {formatBillingPeriod(invoice.billingPeriod, locale)}
              </dd>
            </div>
          </dl>

          <Link
            href={`/invoices/${invoice.id}`}
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-[var(--border)] text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand-soft)]"
          >
            {t("invoices.details")}
          </Link>
        </article>
      ))}
    </div>
  );
}

export function InvoicesManagement({
  records,
  initialStatus = "all",
  canManage,
  billableLeases,
  suggestedBillingPeriod,
  defaultIssueDate,
}: {
  records: readonly InvoiceListRecord[];
  initialStatus?: InvoiceStatusFilter;
  canManage: boolean;
  billableLeases: readonly BillableLeaseOption[];
  suggestedBillingPeriod: string;
  defaultIssueDate: string;
}) {
  const { locale, t } = useLocalization();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<InvoiceStatusFilter>(initialStatus);

  useEffect(() => {
    function syncStatusFromHistory() {
      const value = new URLSearchParams(window.location.search).get("status");
      setStatus(isInvoiceStatusFilter(value) ? value : "all");
    }

    window.addEventListener("popstate", syncStatusFromHistory);
    return () => window.removeEventListener("popstate", syncStatusFromHistory);
  }, []);

  const filteredRecords = useMemo(
    () => filterInvoiceRecords(records, query, status),
    [query, records, status],
  );
  const billingPeriods = [...new Set(
    records.map((record) => record.billingPeriod),
  )];
  const billingPeriod = billingPeriods[0];
  const billingPeriodContext =
    billingPeriods.length > 1
      ? t("invoices.multiplePeriods", {
          count: billingPeriods.length,
        })
      : billingPeriod
        ? formatBillingPeriod(billingPeriod, locale)
        : t("invoices.noPeriod");

  function updateStatus(nextStatus: InvoiceStatusFilter) {
    setStatus(nextStatus);

    const parameters = new URLSearchParams(window.location.search);
    if (nextStatus === "all") {
      parameters.delete("status");
    } else {
      parameters.set("status", nextStatus);
    }

    const queryString = parameters.toString();
    const nextUrl = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;
    window.history.replaceState(window.history.state, "", nextUrl);
  }

  function clearFilters() {
    setQuery("");
    updateStatus("all");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-[28px]">
              {t("invoices.title")}
            </h1>
            <span className="rounded bg-[#f6eddd] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#815d22]">
              {t("invoices.demoBilling")}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {t("invoices.subtitle")}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <InvoiceCreatePanel
            canManage={canManage}
            leases={billableLeases}
            suggestedBillingPeriod={suggestedBillingPeriod}
            defaultIssueDate={defaultIssueDate}
          />
          <p className="text-xs text-[var(--muted)]">
            {billingPeriodContext} ·{" "}
            {canManage
              ? t("invoices.ownerAdminWrite")
              : t("common.readOnly")}
          </p>
        </div>
      </div>

      <InvoiceSummary records={records} />

      <section
        aria-label={t("invoices.filterAria")}
        className="border border-[var(--border)] bg-white p-4 sm:p-5"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(18rem,1fr)_auto_auto] xl:items-end">
          <div className="w-full xl:max-w-md">
            <label
              htmlFor="invoice-search"
              className="mb-2 block text-xs font-semibold text-[var(--foreground)]"
            >
              {t("invoices.search")}
            </label>
            <input
              id="invoice-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("invoices.searchPlaceholder")}
              autoComplete="off"
              className="h-11 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] placeholder:text-[#929c97] hover:border-[#b6c4be] focus:border-[var(--brand)]"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-[var(--foreground)]">
              {t("common.billingPeriod")}
            </p>
            <div className="flex min-h-10 items-center rounded-md border border-[var(--border)] bg-[#f8f6f1] px-3 text-xs font-semibold">
              {billingPeriods.length === 1 && billingPeriod
                ? `${billingPeriodContext} · ${t("common.demo")}`
                : billingPeriodContext}
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-[var(--foreground)]">
              {t("common.status")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => {
                const isSelected = status === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => updateStatus(option.value)}
                    className={`min-h-10 rounded-md border px-3 text-xs font-semibold transition-colors ${
                      isSelected
                        ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                        : "border-[var(--border)] bg-white text-[var(--muted)] hover:border-[#b6c4be] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {t(option.labelKey)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      </section>

      <div className="flex items-center justify-between gap-4">
        <p aria-live="polite" className="text-xs text-[var(--muted)]">
          {t("common.showing", {
            shown: filteredRecords.length,
            total: records.length,
            item: t("invoices.records"),
          })}
        </p>
        {query || status !== "all" ? (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4 hover:decoration-[var(--brand)]"
          >
            {t("common.clearFilters")}
          </button>
        ) : null}
      </div>

      {filteredRecords.length > 0 ? (
        <>
          <DesktopInvoiceTable records={filteredRecords} />
          <MobileInvoiceList records={filteredRecords} />
        </>
      ) : (
        <EmptyState
          title={t("invoices.noMatch")}
          description={t("invoices.noMatchHint")}
          action={
            query || status !== "all" ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex min-h-10 items-center rounded-md bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[var(--brand-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
              >
                {t("common.clearSearchAndFilters")}
              </button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
