"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocalization } from "@/components/localization/localization-provider";
import { EmptyState } from "@/components/ui/empty-state";
import {
  filterTenantRecords,
  type TenantListRecord,
  type TenantStatusFilter,
} from "./tenant-filter";
import { TenantStatusBadge } from "./tenant-status-badge";
import { TenantCreatePanel } from "./tenant-write-panels";
import type { TranslationKey } from "@/lib/i18n/types";
import { formatDisplayValue } from "@/lib/i18n/display-values";

const statusOptions: readonly {
  value: TenantStatusFilter;
  labelKey: TranslationKey;
}[] = [
  { value: "all", labelKey: "common.all" },
  { value: "active", labelKey: "common.status.active" },
  { value: "former", labelKey: "common.status.former" },
  { value: "pending", labelKey: "common.status.pending" },
];

function isTenantStatusFilter(
  value: string | null,
): value is TenantStatusFilter {
  return statusOptions.some((option) => option.value === value);
}

function TenantSummary({
  records,
  availableRoomCount,
}: {
  records: readonly TenantListRecord[];
  availableRoomCount: number;
}) {
  const { t } = useLocalization();
  const metrics = [
    {
      label: t("tenants.active"),
      value: records.filter((record) => record.tenantStatus === "active").length,
    },
    {
      label: t("tenants.former"),
      value: records.filter((record) => record.tenantStatus === "former").length,
    },
    {
      label: t("tenants.pending"),
      value: records.filter((record) => record.tenantStatus === "pending").length,
    },
    { label: t("dashboard.availableRooms"), value: availableRoomCount },
  ];

  return (
    <section
      aria-label={t("tenants.title")}
      className="grid grid-cols-2 gap-3 xl:grid-cols-4"
    >
      {metrics.map((metric) => (
        <article
          key={metric.label}
          className="border border-[var(--border)] bg-white px-4 py-4 sm:px-5"
        >
          <p className="text-xs font-medium text-[var(--muted)]">
            {metric.label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
            {metric.value}
          </p>
        </article>
      ))}
    </section>
  );
}

function DesktopTenantTable({
  records,
}: {
  records: readonly TenantListRecord[];
}) {
  const { locale, t } = useLocalization();

  return (
    <div className="hidden overflow-hidden border border-[var(--border)] bg-white lg:block">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-[10px] uppercase tracking-[0.09em] text-[var(--muted)]">
            <th className="px-5 py-3 font-semibold">{t("common.tenant")}</th>
            <th className="px-4 py-3 font-semibold">{t("tenants.currentRoom")}</th>
            <th className="px-4 py-3 font-semibold">{t("common.location")}</th>
            <th className="px-4 py-3 font-semibold">{t("tenants.phone")}</th>
            <th className="px-4 py-3 font-semibold">{t("tenants.workInstitution")}</th>
            <th className="px-4 py-3 font-semibold">{t("common.status")}</th>
            <th className="px-5 py-3 text-right font-semibold">
              <span className="sr-only">{t("common.actions")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((tenant) => (
            <tr
              key={tenant.id}
              className="border-b border-[var(--border)] transition-colors last:border-b-0 hover:bg-[#fafbf9]"
            >
              <td className="px-5 py-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {tenant.fullName}
                </p>
                {tenant.preferredName ? (
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    {t("tenants.preferred", { name: tenant.preferredName })}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-4">
                <p className="text-xs font-semibold">
                  {tenant.room
                    ? t("common.roomNumber", {
                        number: tenant.room.roomNumber,
                      })
                    : t("tenants.noActiveLease")}
                </p>
              </td>
              <td className="px-4 py-4">
                <p className="text-xs font-medium">
                  {tenant.room
                    ? formatDisplayValue(tenant.room.location, locale)
                    : t("tenants.notApplicable")}
                </p>
                {tenant.room?.floor ? (
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    {t("common.floorNumber", { floor: tenant.room.floor })}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-4 text-xs text-[var(--muted)]">
                {tenant.phone}
              </td>
              <td className="max-w-52 px-4 py-4">
                <p className="text-xs font-medium">
                  {tenant.occupation ?? t("tenants.notProvided")}
                </p>
                {tenant.companyOrInstitution ? (
                  <p className="mt-1 truncate text-[11px] text-[var(--muted)]">
                    {tenant.companyOrInstitution}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-4">
                <TenantStatusBadge status={tenant.tenantStatus} />
              </td>
              <td className="px-5 py-4 text-right">
                <Link
                  href={`/tenants/${tenant.id}`}
                  aria-label={`${t("common.viewDetails")} ${tenant.fullName}`}
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

function MobileTenantList({
  records,
}: {
  records: readonly TenantListRecord[];
}) {
  const { locale, t } = useLocalization();

  return (
    <div className="space-y-3 lg:hidden">
      {records.map((tenant) => (
        <article
          key={tenant.id}
          className="border border-[var(--border)] bg-white p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">{tenant.fullName}</p>
              {tenant.preferredName ? (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {t("tenants.preferred", { name: tenant.preferredName })}
                </p>
              ) : null}
            </div>
            <TenantStatusBadge status={tenant.tenantStatus} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-[var(--border)] py-4">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("tenants.currentRoom")}
              </dt>
              <dd className="mt-1 text-xs font-semibold">
                {tenant.room
                  ? t("common.roomNumber", {
                      number: tenant.room.roomNumber,
                    })
                  : t("tenants.noActiveLease")}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("common.location")}
              </dt>
              <dd className="mt-1 text-xs font-medium">
                {tenant.room
                  ? `${formatDisplayValue(tenant.room.location, locale)}${
                      tenant.room.floor
                        ? `, ${t("common.floorNumber", {
                            floor: tenant.room.floor,
                          })}`
                        : ""
                    }`
                  : t("tenants.notApplicable")}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("tenants.contact")}
              </dt>
              <dd className="mt-1 text-xs font-medium">{tenant.phone}</dd>
            </div>
          </dl>

          <Link
            href={`/tenants/${tenant.id}`}
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-[var(--border)] text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand-soft)]"
          >
            {t("tenants.details")}
          </Link>
        </article>
      ))}
    </div>
  );
}

export function TenantsManagement({
  records,
  availableRoomCount,
  initialStatus = "all",
  canManage = false,
}: {
  records: readonly TenantListRecord[];
  availableRoomCount: number;
  initialStatus?: TenantStatusFilter;
  canManage?: boolean;
}) {
  const { t } = useLocalization();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TenantStatusFilter>(initialStatus);

  useEffect(() => {
    function syncStatusFromHistory() {
      const value = new URLSearchParams(window.location.search).get("status");
      setStatus(isTenantStatusFilter(value) ? value : "all");
    }

    window.addEventListener("popstate", syncStatusFromHistory);
    return () => window.removeEventListener("popstate", syncStatusFromHistory);
  }, []);

  const filteredRecords = useMemo(
    () => filterTenantRecords(records, query, status),
    [query, records, status],
  );
  const activeTenantCount = records.filter(
    (record) => record.tenantStatus === "active",
  ).length;

  function updateStatus(nextStatus: TenantStatusFilter) {
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-[28px]">
              {t("tenants.title")}
            </h1>
            <span className="rounded bg-[#edf0ee] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#59645f]">
              {t("tenants.fictionalProfiles")}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {t("tenants.subtitle")}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <TenantCreatePanel canManage={canManage} />
          <p className="text-xs text-[var(--muted)]">
            {t("tenants.countSummary", {
              active: activeTenantCount,
              available: availableRoomCount,
            })}
          </p>
        </div>
      </div>

      <TenantSummary
        records={records}
        availableRoomCount={availableRoomCount}
      />

      <section
        aria-label={t("tenants.filterAria")}
        className="border border-[var(--border)] bg-white p-4 sm:p-5"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="w-full xl:max-w-md">
            <label
              htmlFor="tenant-search"
              className="mb-2 block text-xs font-semibold text-[var(--foreground)]"
            >
              {t("tenants.search")}
            </label>
            <input
              id="tenant-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("tenants.searchPlaceholder")}
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
            item: t("tenants.records"),
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
          <DesktopTenantTable records={filteredRecords} />
          <MobileTenantList records={filteredRecords} />
        </>
      ) : (
        <EmptyState
          title={t("tenants.noMatch")}
          description={t("tenants.noMatchHint")}
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
