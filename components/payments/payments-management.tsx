"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocalization } from "@/components/localization/localization-provider";
import {
  filterPaymentRecords,
  type PaymentListRecord,
  type PaymentStatusFilter,
} from "@/components/payments/payment-filter";
import { formatPaymentMethod } from "@/components/payments/payment-formatters";
import { PaymentStatusBadge } from "@/components/payments/payment-status-badge";
import {
  PaymentCreatePanel,
  type OutstandingInvoiceOption,
} from "@/components/payments/payment-write-panels";
import { formatIdr, formatRoomDate } from "@/components/rooms/room-formatters";
import { EmptyState } from "@/components/ui/empty-state";
import type { TranslationKey } from "@/lib/i18n/types";

const statusOptions: readonly {
  value: PaymentStatusFilter;
  labelKey: TranslationKey;
}[] = [
  { value: "all", labelKey: "common.all" },
  { value: "completed", labelKey: "common.status.completed" },
  { value: "pending", labelKey: "common.status.pending" },
  { value: "reversed", labelKey: "common.status.reversed" },
];

function isPaymentStatusFilter(
  value: string | null,
): value is PaymentStatusFilter {
  return statusOptions.some((option) => option.value === value);
}

function PaymentSummary({
  records,
}: {
  records: readonly PaymentListRecord[];
}) {
  const { t } = useLocalization();
  const completedPayments = records.filter(
    (payment) => payment.status === "completed",
  );
  const pendingPayments = records.filter(
    (payment) => payment.status === "pending",
  );
  const metrics = [
    {
      label: t("payments.total"),
      value: records.length.toString(),
      detail: t("payments.summaryRecords"),
    },
    {
      label: t("common.totalReceived"),
      value: formatIdr(
        completedPayments.reduce(
          (sum, payment) => sum + payment.amount,
          0,
        ),
      ),
      detail: t("payments.summaryReceived"),
    },
    {
      label: t("payments.thisPeriod"),
      value: records.length.toString(),
      detail: t("payments.summaryPeriod"),
    },
    {
      label: t("payments.pendingUnallocated"),
      value: pendingPayments.length.toString(),
      detail: t("payments.summaryAllocated"),
    },
  ];

  return (
    <section
      aria-label={t("payments.title")}
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

function DesktopPaymentTable({
  records,
}: {
  records: readonly PaymentListRecord[];
}) {
  const { locale, t } = useLocalization();

  return (
    <div className="hidden overflow-hidden border border-[var(--border)] bg-white xl:block">
      <table className="w-full border-collapse text-left">
        <thead className="bg-[#f4f1ea]">
          <tr className="border-b border-[var(--border)]">
            {[
              t("payments.reference"),
              t("common.date"),
              t("common.tenant"),
              t("common.room"),
              t("invoices.title"),
              t("common.method"),
              t("common.amount"),
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
          {records.map((payment) => (
            <tr key={payment.id} className="hover:bg-[#fbfaf7]">
              <td className="px-3 py-4 text-[11px] font-semibold">
                {payment.reference}
              </td>
              <td className="px-3 py-4 text-[11px] text-[var(--muted)]">
                {formatRoomDate(payment.paymentDate, locale)}
              </td>
              <td className="px-3 py-4 text-[11px] font-medium">
                {payment.tenant.fullName}
              </td>
              <td className="px-3 py-4 text-[11px] font-semibold">
                {payment.room.roomNumber}
              </td>
              <td className="px-3 py-4 text-[11px] text-[var(--muted)]">
                {payment.invoice.reference}
              </td>
              <td className="px-3 py-4 text-[11px]">
                {formatPaymentMethod(payment.method, locale)}
              </td>
              <td className="px-3 py-4 text-[11px] font-semibold tabular-nums">
                {formatIdr(payment.amount)}
              </td>
              <td className="px-3 py-4">
                <PaymentStatusBadge status={payment.status} />
              </td>
              <td className="px-3 py-4 text-right">
                <Link
                  href={`/payments/${payment.id}`}
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

function MobilePaymentList({
  records,
}: {
  records: readonly PaymentListRecord[];
}) {
  const { locale, t } = useLocalization();

  return (
    <div className="space-y-3 xl:hidden">
      {records.map((payment) => (
        <article
          key={payment.id}
          className="border border-[var(--border)] bg-white p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                {payment.reference}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {payment.tenant.fullName}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {t("common.roomNumber", { number: payment.room.roomNumber })}
              </p>
            </div>
            <PaymentStatusBadge status={payment.status} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-[var(--border)] py-4">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("common.amount")}
              </dt>
              <dd className="mt-1 text-xs font-semibold tabular-nums">
                {formatIdr(payment.amount)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("common.date")}
              </dt>
              <dd className="mt-1 text-xs font-medium">
                {formatRoomDate(payment.paymentDate, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("invoices.title")}
              </dt>
              <dd className="mt-1 text-xs font-medium">
                {payment.invoice.reference}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("common.method")}
              </dt>
              <dd className="mt-1 text-xs font-medium">
                {formatPaymentMethod(payment.method, locale)}
              </dd>
            </div>
          </dl>

          <Link
            href={`/payments/${payment.id}`}
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-[var(--border)] text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand-soft)]"
          >
            {t("payments.details")}
          </Link>
        </article>
      ))}
    </div>
  );
}

export function PaymentsManagement({
  records,
  initialStatus = "all",
  canManage,
  outstandingInvoices,
  defaultPaymentDate,
}: {
  records: readonly PaymentListRecord[];
  initialStatus?: PaymentStatusFilter;
  canManage: boolean;
  outstandingInvoices: readonly OutstandingInvoiceOption[];
  defaultPaymentDate: string;
}) {
  const { t } = useLocalization();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PaymentStatusFilter>(initialStatus);

  useEffect(() => {
    function syncStatusFromHistory() {
      const value = new URLSearchParams(window.location.search).get("status");
      setStatus(isPaymentStatusFilter(value) ? value : "all");
    }

    window.addEventListener("popstate", syncStatusFromHistory);
    return () => window.removeEventListener("popstate", syncStatusFromHistory);
  }, []);

  const filteredRecords = useMemo(
    () => filterPaymentRecords(records, query, status),
    [query, records, status],
  );

  function updateStatus(nextStatus: PaymentStatusFilter) {
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
              {t("payments.title")}
            </h1>
            <span className="rounded bg-[#f6eddd] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#815d22]">
              {t("payments.ledger")}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {t("payments.subtitle")}
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">
          {canManage
            ? t("payments.ownerAdminWrite")
            : t("common.readOnly")}
        </p>
      </div>

      <PaymentCreatePanel
        canManage={canManage}
        invoices={outstandingInvoices}
        defaultPaymentDate={defaultPaymentDate}
      />

      <PaymentSummary records={records} />

      <section
        aria-label={t("payments.filterAria")}
        className="border border-[var(--border)] bg-white p-4 sm:p-5"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="w-full xl:max-w-md">
            <label
              htmlFor="payment-search"
              className="mb-2 block text-xs font-semibold text-[var(--foreground)]"
            >
              {t("payments.search")}
            </label>
            <input
              id="payment-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("payments.searchPlaceholder")}
              autoComplete="off"
              className="h-11 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] placeholder:text-[#929c97] hover:border-[#b6c4be] focus:border-[var(--brand)]"
            />
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
            item: t("payments.records"),
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
          <DesktopPaymentTable records={filteredRecords} />
          <MobilePaymentList records={filteredRecords} />
        </>
      ) : (
        <EmptyState
          title={t("payments.noMatch")}
          description={t("payments.noMatchHint")}
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
