"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocalization } from "@/components/localization/localization-provider";
import { MaintenanceCategoryBadge } from "@/components/maintenance/maintenance-category-badge";
import {
  type MaintenanceCategoryFilter,
  type MaintenanceListRecord,
  type MaintenancePriorityFilter,
  type MaintenanceStatusFilter,
  filterMaintenanceRecords,
} from "@/components/maintenance/maintenance-filter";
import {
  formatMaintenanceCategory,
  formatMaintenancePriority,
} from "@/components/maintenance/maintenance-formatters";
import { MaintenancePriorityBadge } from "@/components/maintenance/maintenance-priority-badge";
import { MaintenanceStatusBadge } from "@/components/maintenance/maintenance-status-badge";
import {
  MaintenanceCreatePanel,
  type MaintenanceRoomOption,
} from "@/components/maintenance/maintenance-write-panels";
import { formatRoomDate } from "@/components/rooms/room-formatters";
import { EmptyState } from "@/components/ui/empty-state";
import {
  maintenanceCategories,
  maintenancePriorities,
  type MaintenanceSummary,
} from "@/lib/data/types";
import type { TranslationKey } from "@/lib/i18n/types";
import { formatRecordText } from "@/lib/i18n/record-text";
import { formatDisplayValue } from "@/lib/i18n/display-values";

const statusOptions: readonly {
  value: MaintenanceStatusFilter;
  labelKey: TranslationKey;
}[] = [
  { value: "all", labelKey: "common.all" },
  { value: "open", labelKey: "common.status.open" },
  { value: "in_progress", labelKey: "common.status.inProgress" },
  { value: "completed", labelKey: "common.status.completed" },
  { value: "cancelled", labelKey: "common.status.cancelled" },
];

function isStatusFilter(
  value: string | null,
): value is MaintenanceStatusFilter {
  return statusOptions.some((option) => option.value === value);
}

function isPriorityFilter(
  value: string | null,
): value is MaintenancePriorityFilter {
  return (
    value === "all" ||
    maintenancePriorities.some((priority) => priority === value)
  );
}

function isCategoryFilter(
  value: string | null,
): value is MaintenanceCategoryFilter {
  return (
    value === "all" ||
    maintenanceCategories.some((category) => category === value)
  );
}

function MaintenanceSummary({
  summary,
}: {
  summary: MaintenanceSummary;
}) {
  const { t } = useLocalization();
  const metrics = [
    {
      label: t("common.status.open"),
      value: summary.open,
      detail: t("maintenance.summaryOpen"),
    },
    {
      label: t("common.status.inProgress"),
      value: summary.inProgress,
      detail: t("maintenance.summaryInProgress"),
    },
    {
      label: t("common.status.completed"),
      value: summary.completed,
      detail: t("maintenance.summaryCompleted"),
    },
    {
      label: t("maintenance.urgentAttention"),
      value: summary.urgent,
      detail: t("maintenance.summaryUrgent"),
    },
  ];

  return (
    <section
      aria-label={t("navigation.maintenance")}
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
          <p className="mt-2 text-xl font-semibold tabular-nums text-[var(--foreground)] sm:text-2xl">
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

function DesktopMaintenanceTable({
  records,
}: {
  records: readonly MaintenanceListRecord[];
}) {
  const { locale, t } = useLocalization();

  return (
    <div className="hidden overflow-hidden border border-[var(--border)] bg-white xl:block">
      <table className="w-full border-collapse text-left">
        <thead className="bg-[#f4f1ea]">
          <tr className="border-b border-[var(--border)]">
            {[
              t("common.reference"),
              t("maintenance.reported"),
              t("maintenance.issue"),
              t("common.location"),
              t("common.category"),
              t("maintenance.priority"),
              t("common.status"),
              "",
            ].map((heading) => (
              <th
                key={heading || "actions"}
                scope="col"
                className="px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {records.map((record) => (
            <tr key={record.id} className="hover:bg-[#fbfaf7]">
              <td className="px-4 py-4 text-[11px] font-semibold">
                {record.reference}
              </td>
              <td className="px-4 py-4 text-[11px] text-[var(--muted)]">
                {formatRoomDate(record.reportedDate, locale)}
              </td>
              <td className="max-w-60 px-4 py-4">
                <p className="text-[11px] font-semibold">{formatRecordText(record.title, locale)}</p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[var(--muted)]">
                  {formatRecordText(record.description, locale)}
                </p>
              </td>
              <td className="px-4 py-4">
                <p className="text-[11px] font-semibold">
                  {record.room
                    ? t("common.roomNumber", { number: record.room.roomNumber })
                    : t("common.propertyWide")}
                </p>
                {record.room ? (
                  <p className="mt-1 text-[10px] text-[var(--muted)]">
                    {formatDisplayValue(record.room.location, locale)}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-4">
                <MaintenanceCategoryBadge category={record.category} />
              </td>
              <td className="px-4 py-4">
                <MaintenancePriorityBadge priority={record.priority} />
              </td>
              <td className="px-4 py-4">
                <MaintenanceStatusBadge status={record.status} />
              </td>
              <td className="px-4 py-4 text-right">
                <Link
                  href={`/maintenance/${record.reference}`}
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

function MobileMaintenanceList({
  records,
}: {
  records: readonly MaintenanceListRecord[];
}) {
  const { locale, t } = useLocalization();

  return (
    <div className="space-y-3 xl:hidden">
      {records.map((record) => (
        <article
          key={record.id}
          className="border border-[var(--border)] bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {record.reference}
              </p>
              <p className="mt-1 text-sm font-semibold">{formatRecordText(record.title, locale)}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                {formatRecordText(record.description, locale)}
              </p>
            </div>
            <MaintenancePriorityBadge priority={record.priority} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <MaintenanceStatusBadge status={record.status} />
            <MaintenanceCategoryBadge category={record.category} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-4 border-y border-[var(--border)] py-4">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("common.location")}
              </dt>
              <dd className="mt-1 text-xs font-semibold">
                {record.room
                  ? t("common.roomNumber", { number: record.room.roomNumber })
                  : t("common.propertyWide")}
              </dd>
              {record.room ? (
                <dd className="mt-1 text-[10px] text-[var(--muted)]">
                  {formatDisplayValue(record.room.location, locale)}
                </dd>
              ) : null}
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("maintenance.reported")}
              </dt>
              <dd className="mt-1 text-xs font-medium">
                {formatRoomDate(record.reportedDate, locale)}
              </dd>
            </div>
          </dl>

          <Link
            href={`/maintenance/${record.reference}`}
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-[var(--border)] text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand-soft)]"
          >
            {t("maintenance.details")}
          </Link>
        </article>
      ))}
    </div>
  );
}

export function MaintenanceManagement({
  records,
  summary,
  initialStatus = "all",
  initialPriority = "all",
  initialCategory = "all",
  canManage,
  rooms,
  defaultReportedDate,
}: {
  records: readonly MaintenanceListRecord[];
  summary: MaintenanceSummary;
  initialStatus?: MaintenanceStatusFilter;
  initialPriority?: MaintenancePriorityFilter;
  initialCategory?: MaintenanceCategoryFilter;
  canManage: boolean;
  rooms: readonly MaintenanceRoomOption[];
  defaultReportedDate: string;
}) {
  const { locale, t } = useLocalization();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<MaintenanceStatusFilter>(initialStatus);
  const [priority, setPriority] =
    useState<MaintenancePriorityFilter>(initialPriority);
  const [category, setCategory] =
    useState<MaintenanceCategoryFilter>(initialCategory);

  useEffect(() => {
    function syncFiltersFromHistory() {
      const parameters = new URLSearchParams(window.location.search);
      const nextStatus = parameters.get("status");
      const nextPriority = parameters.get("priority");
      const nextCategory = parameters.get("category");

      setStatus(isStatusFilter(nextStatus) ? nextStatus : "all");
      setPriority(isPriorityFilter(nextPriority) ? nextPriority : "all");
      setCategory(isCategoryFilter(nextCategory) ? nextCategory : "all");
    }

    window.addEventListener("popstate", syncFiltersFromHistory);
    return () =>
      window.removeEventListener("popstate", syncFiltersFromHistory);
  }, []);

  const filteredRecords = useMemo(
    () =>
      filterMaintenanceRecords(
        records,
        query,
        status,
        priority,
        category,
      ),
    [category, priority, query, records, status],
  );

  function updateFilters(
    nextStatus: MaintenanceStatusFilter,
    nextPriority: MaintenancePriorityFilter,
    nextCategory: MaintenanceCategoryFilter,
  ) {
    setStatus(nextStatus);
    setPriority(nextPriority);
    setCategory(nextCategory);

    const parameters = new URLSearchParams(window.location.search);
    const filters = {
      status: nextStatus,
      priority: nextPriority,
      category: nextCategory,
    };

    for (const [key, value] of Object.entries(filters)) {
      if (value === "all") {
        parameters.delete(key);
      } else {
        parameters.set(key, value);
      }
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
    updateFilters("all", "all", "all");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-[28px]">
              {t("navigation.maintenance")}
            </h1>
            <span className="rounded bg-[var(--brand-soft)] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
              {t("maintenance.persisted")}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {t("maintenance.subtitle")}
          </p>
        </div>
        <MaintenanceCreatePanel
          canManage={canManage}
          rooms={rooms}
          defaultReportedDate={defaultReportedDate}
        />
      </div>

      <MaintenanceSummary summary={summary} />

      <section
        aria-label={t("maintenance.filterAria")}
        className="border border-[var(--border)] bg-white p-4 sm:p-5"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(16rem,1fr)_auto_auto] xl:items-end">
          <div>
            <label
              htmlFor="maintenance-search"
              className="mb-2 block text-xs font-semibold text-[var(--foreground)]"
            >
              {t("maintenance.search")}
            </label>
            <input
              id="maintenance-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("maintenance.searchPlaceholder")}
              autoComplete="off"
              className="h-11 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] placeholder:text-[#929c97] hover:border-[#b6c4be] focus:border-[var(--brand)]"
            />
          </div>

          <div>
            <label
              htmlFor="maintenance-priority"
              className="mb-2 block text-xs font-semibold text-[var(--foreground)]"
            >
              {t("maintenance.priority")}
            </label>
            <select
              id="maintenance-priority"
              value={priority}
              onChange={(event) => {
                const nextPriority = event.target.value;
                if (isPriorityFilter(nextPriority)) {
                  updateFilters(status, nextPriority, category);
                }
              }}
              className="h-11 w-full min-w-40 rounded-md border border-[var(--border)] bg-white px-3 text-sm hover:border-[#b6c4be] focus:border-[var(--brand)]"
            >
              <option value="all">{t("maintenance.allPriorities")}</option>
              {maintenancePriorities.map((maintenancePriority) => (
                <option
                  key={maintenancePriority}
                  value={maintenancePriority}
                >
                  {formatMaintenancePriority(maintenancePriority, locale)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="maintenance-category"
              className="mb-2 block text-xs font-semibold text-[var(--foreground)]"
            >
              {t("common.category")}
            </label>
            <select
              id="maintenance-category"
              value={category}
              onChange={(event) => {
                const nextCategory = event.target.value;
                if (isCategoryFilter(nextCategory)) {
                  updateFilters(status, priority, nextCategory);
                }
              }}
              className="h-11 w-full min-w-40 rounded-md border border-[var(--border)] bg-white px-3 text-sm hover:border-[#b6c4be] focus:border-[var(--brand)]"
            >
              <option value="all">{t("maintenance.allCategories")}</option>
              {maintenanceCategories.map((maintenanceCategory) => (
                <option
                  key={maintenanceCategory}
                  value={maintenanceCategory}
                >
                  {formatMaintenanceCategory(maintenanceCategory, locale)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="mt-4 border-t border-[var(--border)] pt-4">
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
                  onClick={() =>
                    updateFilters(option.value, priority, category)
                  }
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
      </section>

      <div className="flex items-center justify-between gap-4">
        <p aria-live="polite" className="text-xs text-[var(--muted)]">
          {t("common.showing", {
            shown: filteredRecords.length,
            total: records.length,
            item: t("maintenance.records"),
          })}
        </p>
        {query ||
        status !== "all" ||
        priority !== "all" ||
        category !== "all" ? (
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
          <DesktopMaintenanceTable records={filteredRecords} />
          <MobileMaintenanceList records={filteredRecords} />
        </>
      ) : (
        <EmptyState
          title={t("maintenance.noMatch")}
          description={t("maintenance.noMatchHint")}
          action={
            query ||
            status !== "all" ||
            priority !== "all" ||
            category !== "all" ? (
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
