"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocalization } from "@/components/localization/localization-provider";
import { EmptyState } from "@/components/ui/empty-state";
import {
  filterLeaseRecords,
  type LeaseListRecord,
  type LeaseStatusFilter,
} from "@/components/leases/lease-filter";
import { LeaseStatusBadge } from "@/components/leases/lease-status-badge";
import {
  LeaseCreatePanel,
  type EligibleLeaseRoom,
  type EligibleLeaseTenant,
} from "@/components/leases/lease-write-panels";
import { formatIdr, formatRoomDate } from "@/components/rooms/room-formatters";
import type { TranslationKey } from "@/lib/i18n/types";
import { formatDisplayValue } from "@/lib/i18n/display-values";

const statusOptions: readonly {
  value: LeaseStatusFilter;
  labelKey: TranslationKey;
}[] = [
  { value: "all", labelKey: "common.all" },
  { value: "active", labelKey: "common.status.active" },
  { value: "upcoming", labelKey: "common.status.upcoming" },
  { value: "ended", labelKey: "common.status.ended" },
];

function isLeaseStatusFilter(
  value: string | null,
): value is LeaseStatusFilter {
  return statusOptions.some((option) => option.value === value);
}

function LeaseSummary({
  records,
  availableRoomCount,
}: {
  records: readonly LeaseListRecord[];
  availableRoomCount: number;
}) {
  const { t } = useLocalization();
  const counts = {
    active: records.filter((record) => record.status === "active").length,
    upcoming: records.filter((record) => record.status === "upcoming").length,
    ended: records.filter((record) => record.status === "ended").length,
  };
  const metrics = [
    { label: t("leases.active"), value: counts.active },
    { label: t("leases.upcoming"), value: counts.upcoming },
    { label: t("leases.ended"), value: counts.ended },
    { label: t("dashboard.availableRooms"), value: availableRoomCount },
  ];

  return (
    <section
      aria-label={t("leases.title")}
      className="grid grid-cols-2 border border-[var(--border)] bg-white lg:grid-cols-4"
    >
      {metrics.map((metric, index) => (
        <div
          key={metric.label}
          className={`p-4 sm:p-5 ${
            index < 2 ? "border-b border-[var(--border)] lg:border-b-0" : ""
          } ${index % 2 === 0 ? "border-r border-[var(--border)]" : ""} ${
            index === 1 ? "lg:border-r" : ""
          } ${index === 2 ? "lg:border-r" : ""}`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            {metric.label}
          </p>
          <p className="mt-2 text-xl font-semibold tabular-nums text-[var(--foreground)]">
            {metric.value}
          </p>
        </div>
      ))}
    </section>
  );
}

function DesktopLeaseTable({
  records,
}: {
  records: readonly LeaseListRecord[];
}) {
  const { locale, t } = useLocalization();

  return (
    <div className="hidden overflow-hidden border border-[var(--border)] bg-white lg:block">
      <table className="w-full border-collapse text-left">
        <thead className="bg-[#f4f1ea]">
          <tr className="border-b border-[var(--border)]">
            {[
              t("leases.title"),
              t("common.tenant"),
              t("common.room"),
              t("common.monthlyRent"),
              t("leases.startDate"),
              t("leases.billingDay"),
              t("common.status"),
              "",
            ].map((heading) => (
              <th
                key={heading || "actions"}
                scope="col"
                className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {records.map((lease) => (
            <tr key={lease.id} className="hover:bg-[#fbfaf7]">
              <td className="px-4 py-4 text-xs font-semibold">
                {lease.reference}
              </td>
              <td className="px-4 py-4 text-xs font-medium">
                {lease.tenant.fullName}
              </td>
              <td className="px-4 py-4">
                <p className="text-xs font-semibold">
                  {t("common.roomNumber", { number: lease.room.roomNumber })}
                </p>
                <p className="mt-1 text-[10px] text-[var(--muted)]">
                  {formatDisplayValue(lease.room.location, locale)}
                </p>
              </td>
              <td className="px-4 py-4 text-xs font-semibold tabular-nums">
                {formatIdr(lease.monthlyRent)}
              </td>
              <td className="px-4 py-4 text-xs text-[var(--muted)]">
                {formatRoomDate(lease.startDate, locale)}
              </td>
              <td className="px-4 py-4 text-xs font-medium">
                {t("common.day", { day: lease.billingDay })}
              </td>
              <td className="px-4 py-4">
                <LeaseStatusBadge status={lease.status} />
              </td>
              <td className="px-4 py-4 text-right">
                <Link
                  href={`/leases/${lease.id}`}
                  className="inline-flex min-h-9 items-center rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--brand)] hover:border-[#b6c4be] hover:bg-[var(--brand-soft)]"
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

function MobileLeaseList({
  records,
}: {
  records: readonly LeaseListRecord[];
}) {
  const { locale, t } = useLocalization();

  return (
    <div className="space-y-3 lg:hidden">
      {records.map((lease) => (
        <article
          key={lease.id}
          className="border border-[var(--border)] bg-white p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                {lease.reference}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {lease.tenant.fullName}
              </p>
            </div>
            <LeaseStatusBadge status={lease.status} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-[var(--border)] py-4">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("common.room")}
              </dt>
              <dd className="mt-1 text-xs font-semibold">
                {t("common.roomNumber", { number: lease.room.roomNumber })}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("common.monthlyRent")}
              </dt>
              <dd className="mt-1 text-xs font-semibold tabular-nums">
                {formatIdr(lease.monthlyRent)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("leases.startDate")}
              </dt>
              <dd className="mt-1 text-xs font-medium">
                {formatRoomDate(lease.startDate, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("leases.billing")}
              </dt>
              <dd className="mt-1 text-xs font-medium">
                {t("common.day", { day: lease.billingDay })}
              </dd>
            </div>
          </dl>

          <Link
            href={`/leases/${lease.id}`}
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-[var(--border)] text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand-soft)]"
          >
            {t("leases.viewDetails")}
          </Link>
        </article>
      ))}
    </div>
  );
}

export function LeasesManagement({
  records,
  availableRoomCount,
  initialStatus = "all",
  canManage = false,
  eligibleTenants = [],
  eligibleRooms = [],
}: {
  records: readonly LeaseListRecord[];
  availableRoomCount: number;
  initialStatus?: LeaseStatusFilter;
  canManage?: boolean;
  eligibleTenants?: readonly EligibleLeaseTenant[];
  eligibleRooms?: readonly EligibleLeaseRoom[];
}) {
  const { t } = useLocalization();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LeaseStatusFilter>(initialStatus);

  useEffect(() => {
    function syncStatusFromHistory() {
      const value = new URLSearchParams(window.location.search).get("status");
      setStatus(isLeaseStatusFilter(value) ? value : "all");
    }

    window.addEventListener("popstate", syncStatusFromHistory);
    return () => window.removeEventListener("popstate", syncStatusFromHistory);
  }, []);

  const filteredRecords = useMemo(
    () => filterLeaseRecords(records, query, status),
    [query, records, status],
  );

  function updateStatus(nextStatus: LeaseStatusFilter) {
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
              {t("leases.title")}
            </h1>
            <span className="rounded bg-[#edf0ee] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#59645f]">
              {t("leases.demoTerms")}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {t("leases.subtitle")}
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">
          {t("leases.countSummary", { count: records.length })}
        </p>
      </div>

      <LeaseCreatePanel
        canManage={canManage}
        tenants={eligibleTenants}
        rooms={eligibleRooms}
      />

      <LeaseSummary
        records={records}
        availableRoomCount={availableRoomCount}
      />

      <section
        aria-label={t("leases.filterAria")}
        className="border border-[var(--border)] bg-white p-4 sm:p-5"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="w-full xl:max-w-md">
            <label
              htmlFor="lease-search"
              className="mb-2 block text-xs font-semibold text-[var(--foreground)]"
            >
              {t("leases.search")}
            </label>
            <input
              id="lease-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("leases.searchPlaceholder")}
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
            item: t("leases.records"),
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
          <DesktopLeaseTable records={filteredRecords} />
          <MobileLeaseList records={filteredRecords} />
        </>
      ) : (
        <EmptyState
          title={t("leases.noMatch")}
          description={t("leases.noMatchHint")}
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
