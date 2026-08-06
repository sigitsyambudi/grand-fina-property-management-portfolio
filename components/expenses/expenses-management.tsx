"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocalization } from "@/components/localization/localization-provider";
import { ExpenseCategoryBadge } from "@/components/expenses/expense-category-badge";
import {
  type ExpenseCategoryFilter,
  type ExpenseListRecord,
  type ExpenseStatusFilter,
  filterExpenseRecords,
} from "@/components/expenses/expense-filter";
import {
  formatExpenseCategory,
  formatExpensePaymentMethod,
} from "@/components/expenses/expense-formatters";
import { ExpenseStatusBadge } from "@/components/expenses/expense-status-badge";
import {
  ExpenseCreatePanel,
  type ExpenseRoomOption,
} from "@/components/expenses/expense-write-panels";
import { formatIdr, formatRoomDate } from "@/components/rooms/room-formatters";
import { EmptyState } from "@/components/ui/empty-state";
import {
  expenseCategories,
  type ExpenseSummary,
} from "@/lib/data/types";
import type { TranslationKey } from "@/lib/i18n/types";
import { formatRecordText } from "@/lib/i18n/record-text";

const statusOptions: readonly {
  value: ExpenseStatusFilter;
  labelKey: TranslationKey;
}[] = [
  { value: "all", labelKey: "common.all" },
  { value: "recorded", labelKey: "common.status.recorded" },
  { value: "pending", labelKey: "common.status.pending" },
  { value: "void", labelKey: "common.status.void" },
];

function isExpenseStatusFilter(
  value: string | null,
): value is ExpenseStatusFilter {
  return statusOptions.some((option) => option.value === value);
}

function isExpenseCategoryFilter(
  value: string | null,
): value is ExpenseCategoryFilter {
  return (
    value === "all" ||
    expenseCategories.some((category) => category === value)
  );
}

function ExpenseSummary({
  summary,
}: {
  summary: ExpenseSummary;
}) {
  const { t } = useLocalization();
  const metrics = [
    {
      label: t("expenses.total"),
      value: formatIdr(summary.totalAmount),
      detail: t("expenses.summaryTotal"),
    },
    {
      label: t("common.status.recorded"),
      value: formatIdr(summary.recordedAmount),
      detail: t("expenses.summaryRecorded", {
        count: summary.recordedCount,
      }),
    },
    {
      label: t("common.status.pending"),
      value: formatIdr(summary.pendingAmount),
      detail: t("expenses.summaryPending", {
        count: summary.pendingCount,
      }),
    },
    {
      label: t("expenses.scope"),
      value: `${summary.propertyWideCount} / ${summary.roomSpecificCount}`,
      detail: `${t("common.propertyWide")} / ${t("common.roomSpecific")}`,
    },
  ];

  return (
    <section
      aria-label={t("expenses.title")}
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

function DesktopExpenseTable({
  records,
}: {
  records: readonly ExpenseListRecord[];
}) {
  const { locale, t } = useLocalization();

  return (
    <div className="hidden overflow-hidden border border-[var(--border)] bg-white xl:block">
      <table className="w-full border-collapse text-left">
        <thead className="bg-[#f4f1ea]">
          <tr className="border-b border-[var(--border)]">
            {[
              t("common.reference"),
              t("common.date"),
              t("common.category"),
              t("common.description"),
              t("common.vendor"),
              t("common.scope"),
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
          {records.map((expense) => (
            <tr key={expense.id} className="hover:bg-[#fbfaf7]">
              <td className="px-3 py-4 text-[10px] font-semibold">
                {expense.reference}
              </td>
              <td className="px-3 py-4 text-[11px] text-[var(--muted)]">
                {formatRoomDate(expense.expenseDate, locale)}
              </td>
              <td className="px-3 py-4">
                <ExpenseCategoryBadge category={expense.category} />
              </td>
              <td className="max-w-44 px-3 py-4 text-[11px] font-medium">
                {formatRecordText(expense.description, locale)}
              </td>
              <td className="max-w-36 px-3 py-4 text-[11px] text-[var(--muted)]">
                {formatRecordText(expense.vendor, locale)}
              </td>
              <td className="px-3 py-4 text-[11px] font-medium">
                {expense.room
                  ? t("common.roomNumber", { number: expense.room.roomNumber })
                  : t("common.propertyWide")}
              </td>
              <td className="px-3 py-4 text-[11px]">
                {formatExpensePaymentMethod(expense.paymentMethod, locale)}
              </td>
              <td className="px-3 py-4 text-[11px] font-semibold tabular-nums">
                {formatIdr(expense.amount)}
              </td>
              <td className="px-3 py-4">
                <ExpenseStatusBadge status={expense.status} />
              </td>
              <td className="px-3 py-4 text-right">
                <Link
                  href={`/expenses/${expense.id}`}
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

function MobileExpenseList({
  records,
}: {
  records: readonly ExpenseListRecord[];
}) {
  const { locale, t } = useLocalization();

  return (
    <div className="space-y-3 xl:hidden">
      {records.map((expense) => (
        <article
          key={expense.id}
          className="border border-[var(--border)] bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {expense.reference}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatRecordText(expense.description, locale)}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {formatRecordText(expense.vendor, locale)}
              </p>
            </div>
            <ExpenseStatusBadge status={expense.status} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ExpenseCategoryBadge category={expense.category} />
            <span className="text-xs font-medium text-[var(--muted)]">
              {expense.room
                ? t("common.roomNumber", { number: expense.room.roomNumber })
                : t("common.propertyWide")}
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-[var(--border)] py-4">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("common.amount")}
              </dt>
              <dd className="mt-1 text-xs font-semibold tabular-nums">
                {formatIdr(expense.amount)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("common.date")}
              </dt>
              <dd className="mt-1 text-xs font-medium">
                {formatRoomDate(expense.expenseDate, locale)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("payments.method")}
              </dt>
              <dd className="mt-1 text-xs font-medium">
                {formatExpensePaymentMethod(expense.paymentMethod, locale)}
              </dd>
            </div>
          </dl>

          <Link
            href={`/expenses/${expense.id}`}
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-[var(--border)] text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand-soft)]"
          >
            {t("expenses.details")}
          </Link>
        </article>
      ))}
    </div>
  );
}

export function ExpensesManagement({
  records,
  summary,
  initialStatus = "all",
  initialCategory = "all",
  canManage,
  rooms,
  defaultExpenseDate,
}: {
  records: readonly ExpenseListRecord[];
  summary: ExpenseSummary;
  initialStatus?: ExpenseStatusFilter;
  initialCategory?: ExpenseCategoryFilter;
  canManage: boolean;
  rooms: readonly ExpenseRoomOption[];
  defaultExpenseDate: string;
}) {
  const { locale, t } = useLocalization();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ExpenseStatusFilter>(initialStatus);
  const [category, setCategory] =
    useState<ExpenseCategoryFilter>(initialCategory);

  useEffect(() => {
    function syncFiltersFromHistory() {
      const parameters = new URLSearchParams(window.location.search);
      const nextStatus = parameters.get("status");
      const nextCategory = parameters.get("category");

      setStatus(isExpenseStatusFilter(nextStatus) ? nextStatus : "all");
      setCategory(isExpenseCategoryFilter(nextCategory) ? nextCategory : "all");
    }

    window.addEventListener("popstate", syncFiltersFromHistory);
    return () =>
      window.removeEventListener("popstate", syncFiltersFromHistory);
  }, []);

  const filteredRecords = useMemo(
    () => filterExpenseRecords(records, query, status, category),
    [category, query, records, status],
  );

  function updateFilters(
    nextStatus: ExpenseStatusFilter,
    nextCategory: ExpenseCategoryFilter,
  ) {
    setStatus(nextStatus);
    setCategory(nextCategory);

    const parameters = new URLSearchParams(window.location.search);
    if (nextStatus === "all") {
      parameters.delete("status");
    } else {
      parameters.set("status", nextStatus);
    }
    if (nextCategory === "all") {
      parameters.delete("category");
    } else {
      parameters.set("category", nextCategory);
    }

    const queryString = parameters.toString();
    window.history.replaceState(
      window.history.state,
      "",
      queryString
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname,
    );
  }

  function clearFilters() {
    setQuery("");
    updateFilters("all", "all");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-[28px]">
              {t("expenses.title")}
            </h1>
            <span className="rounded bg-[var(--brand-soft)] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
              {t("expenses.persisted")}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {t("expenses.subtitle")}
          </p>
        </div>
        <ExpenseCreatePanel
          canManage={canManage}
          rooms={rooms}
          defaultExpenseDate={defaultExpenseDate}
        />
      </div>

      <ExpenseSummary summary={summary} />

      <section
        aria-label={t("expenses.filterAria")}
        className="border border-[var(--border)] bg-white p-4 sm:p-5"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(16rem,1fr)_auto_auto] xl:items-end">
          <div>
            <label
              htmlFor="expense-search"
              className="mb-2 block text-xs font-semibold text-[var(--foreground)]"
            >
              {t("expenses.search")}
            </label>
            <input
              id="expense-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("expenses.searchPlaceholder")}
              autoComplete="off"
              className="h-11 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] placeholder:text-[#929c97] hover:border-[#b6c4be] focus:border-[var(--brand)]"
            />
          </div>

          <div>
            <label
              htmlFor="expense-category"
              className="mb-2 block text-xs font-semibold text-[var(--foreground)]"
            >
              {t("common.category")}
            </label>
            <select
              id="expense-category"
              value={category}
              onChange={(event) => {
                const nextCategory = event.target.value;
                if (isExpenseCategoryFilter(nextCategory)) {
                  updateFilters(status, nextCategory);
                }
              }}
              className="h-11 w-full min-w-44 rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] hover:border-[#b6c4be] focus:border-[var(--brand)]"
            >
              <option value="all">{t("expenses.allCategories")}</option>
              {expenseCategories.map((expenseCategory) => (
                <option key={expenseCategory} value={expenseCategory}>
                  {formatExpenseCategory(expenseCategory, locale)}
                </option>
              ))}
            </select>
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
                    onClick={() => updateFilters(option.value, category)}
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
            item: t("expenses.records"),
          })}
        </p>
        {query || status !== "all" || category !== "all" ? (
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
          <DesktopExpenseTable records={filteredRecords} />
          <MobileExpenseList records={filteredRecords} />
        </>
      ) : (
        <EmptyState
          title={t("expenses.noMatch")}
          description={t("expenses.noMatchHint")}
          action={
            query || status !== "all" || category !== "all" ? (
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
