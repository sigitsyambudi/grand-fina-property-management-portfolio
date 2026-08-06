"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocalization } from "@/components/localization/localization-provider";
import { EmptyState } from "@/components/ui/empty-state";
import type { Room, RoomStatus } from "@/lib/data/types";
import type { TranslationKey } from "@/lib/i18n/types";
import { formatDisplayValue } from "@/lib/i18n/display-values";
import { formatRecordText } from "@/lib/i18n/record-text";
import type { Locale } from "@/lib/i18n/types";
import { formatIdr, formatRoomDate } from "./room-formatters";
import { RoomStatusBadge } from "./room-status-badge";

export type RoomStatusFilter = "All" | RoomStatus;

const statusOptions: readonly RoomStatusFilter[] = [
  "All",
  "Occupied",
  "Available",
  "Maintenance",
];

const statusTranslationKeys: Record<RoomStatusFilter, TranslationKey> = {
  All: "common.all",
  Occupied: "common.status.occupied",
  Available: "common.status.available",
  Maintenance: "common.status.maintenance",
};

function isRoomStatusFilter(value: string | null): value is RoomStatusFilter {
  return statusOptions.some((status) => status === value);
}

function getUpcomingInformation(
  room: Room,
  t: ReturnType<typeof useLocalization>["t"],
  locale: Locale,
): string {
  if (room.status === "Occupied") {
    return t("rooms.rentDue", { date: formatRoomDate(room.nextDueDate, locale) });
  }

  if (room.status === "Maintenance") {
    return formatRecordText(room.maintenanceNote, locale);
  }

  return t("rooms.ready");
}

function RoomSummary({ rooms }: { rooms: readonly Room[] }) {
  const { t } = useLocalization();
  const metrics = [
    { label: t("dashboard.totalRooms"), value: rooms.length },
    {
      label: t("common.status.occupied"),
      value: rooms.filter((room) => room.status === "Occupied").length,
    },
    {
      label: t("common.status.available"),
      value: rooms.filter((room) => room.status === "Available").length,
    },
    {
      label: t("common.status.maintenance"),
      value: rooms.filter((room) => room.status === "Maintenance").length,
    },
  ];

  return (
    <section
      aria-label={t("rooms.summary")}
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

function DesktopRoomTable({ rooms }: { rooms: readonly Room[] }) {
  const { locale, t } = useLocalization();

  return (
    <div className="hidden overflow-hidden border border-[var(--border)] bg-white lg:block">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-[10px] uppercase tracking-[0.09em] text-[var(--muted)]">
            <th className="px-5 py-3 font-semibold">{t("common.room")}</th>
            <th className="px-4 py-3 font-semibold">{t("common.location")}</th>
            <th className="px-4 py-3 font-semibold">{t("common.status")}</th>
            <th className="px-4 py-3 font-semibold">
              {t("rooms.tenantAvailability")}
            </th>
            <th className="px-4 py-3 font-semibold">
              {t("common.monthlyRate")}
            </th>
            <th className="px-4 py-3 font-semibold">{t("rooms.upcoming")}</th>
            <th className="px-5 py-3 text-right font-semibold">
              <span className="sr-only">{t("common.actions")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr
              key={room.id}
              className="border-b border-[var(--border)] transition-colors last:border-b-0 hover:bg-[#fafbf9]"
            >
              <td className="px-5 py-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {t("common.roomNumber", { number: room.roomNumber })}
                </p>
              </td>
              <td className="px-4 py-4">
                <p className="text-xs font-medium">{formatDisplayValue(room.location, locale)}</p>
                {room.floor ? (
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    {t("common.floorNumber", { floor: room.floor })}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-4">
                <RoomStatusBadge status={room.status} />
              </td>
              <td className="px-4 py-4">
                <p className="text-xs font-medium">
                  {room.tenantName ?? t("common.unassigned")}
                </p>
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  {room.status === "Occupied"
                    ? t("rooms.since", {
                        date: formatRoomDate(room.occupancyStartDate, locale),
                      })
                    : t("common.noCurrentTenant")}
                </p>
              </td>
              <td className="px-4 py-4 text-xs font-semibold tabular-nums">
                {formatIdr(room.monthlyRate)}
              </td>
              <td className="max-w-48 px-4 py-4 text-xs leading-5 text-[var(--muted)]">
                {getUpcomingInformation(room, t, locale)}
              </td>
              <td className="px-5 py-4 text-right">
                <Link
                  href={`/rooms/${room.id}`}
                  aria-label={`${t("common.viewDetails")} ${t("common.roomNumber", { number: room.roomNumber })}`}
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

function MobileRoomList({ rooms }: { rooms: readonly Room[] }) {
  const { locale, t } = useLocalization();

  return (
    <div className="space-y-3 lg:hidden">
      {rooms.map((room) => (
        <article
          key={room.id}
          className="border border-[var(--border)] bg-white p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">
                {t("common.roomNumber", { number: room.roomNumber })}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {formatDisplayValue(room.location, locale)}
                {room.floor
                  ? ` · ${t("common.floorNumber", { floor: room.floor })}`
                  : ""}
              </p>
            </div>
            <RoomStatusBadge status={room.status} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-[var(--border)] py-4">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("common.location")}
              </dt>
              <dd className="mt-1 text-xs font-medium">
                {formatDisplayValue(room.location, locale)}
                {room.floor
                  ? `, ${t("common.floorNumber", { floor: room.floor })}`
                  : ""}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("common.monthlyRate")}
              </dt>
              <dd className="mt-1 text-xs font-semibold tabular-nums">
                {formatIdr(room.monthlyRate)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("common.tenant")}
              </dt>
              <dd className="mt-1 text-xs font-medium">
                {room.tenantName ?? t("common.unassigned")}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {t("rooms.upcoming")}
              </dt>
              <dd className="mt-1 text-xs leading-5 text-[var(--muted)]">
                {getUpcomingInformation(room, t, locale)}
              </dd>
            </div>
          </dl>

          <Link
            href={`/rooms/${room.id}`}
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-[var(--border)] text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand-soft)]"
          >
            {t("rooms.viewDetails")}
          </Link>
        </article>
      ))}
    </div>
  );
}

export function RoomsManagement({
  rooms,
  initialStatus = "All",
}: {
  rooms: readonly Room[];
  initialStatus?: RoomStatusFilter;
}) {
  const { t } = useLocalization();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RoomStatusFilter>(initialStatus);

  useEffect(() => {
    function syncStatusFromHistory() {
      const value = new URLSearchParams(window.location.search).get("status");
      setStatus(isRoomStatusFilter(value) ? value : "All");
    }

    window.addEventListener("popstate", syncStatusFromHistory);
    return () => window.removeEventListener("popstate", syncStatusFromHistory);
  }, []);

  const filteredRooms = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("en");

    return rooms.filter((room) => {
      const matchesStatus = status === "All" || room.status === status;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        room.roomNumber.toLocaleLowerCase("en").includes(normalizedQuery) ||
        room.location.toLocaleLowerCase("en").includes(normalizedQuery) ||
        room.tenantName?.toLocaleLowerCase("en").includes(normalizedQuery) ===
          true;

      return matchesStatus && matchesQuery;
    });
  }, [query, rooms, status]);

  function updateStatus(nextStatus: RoomStatusFilter) {
    setStatus(nextStatus);

    const parameters = new URLSearchParams(window.location.search);
    if (nextStatus === "All") {
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
    updateStatus("All");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-[28px]">
              {t("rooms.title")}
            </h1>
            <span className="rounded bg-[#edf0ee] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#59645f]">
              {t("common.demoData")}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {t("rooms.subtitle")}
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">
          {t("rooms.countSummary")}
        </p>
      </div>

      <RoomSummary rooms={rooms} />

      <section
        aria-label={t("rooms.filterAria")}
        className="border border-[var(--border)] bg-white p-4 sm:p-5"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="w-full xl:max-w-md">
            <label
              htmlFor="room-search"
              className="mb-2 block text-xs font-semibold text-[var(--foreground)]"
            >
              {t("rooms.search")}
            </label>
            <input
              id="room-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("rooms.searchPlaceholder")}
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
                const isSelected = status === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => updateStatus(option)}
                    className={`min-h-10 rounded-md border px-3 text-xs font-semibold transition-colors ${
                      isSelected
                        ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                        : "border-[var(--border)] bg-white text-[var(--muted)] hover:border-[#b6c4be] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {t(statusTranslationKeys[option])}
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
            shown: filteredRooms.length,
            total: rooms.length,
            item: t("rooms.records"),
          })}
        </p>
        {query || status !== "All" ? (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4 hover:decoration-[var(--brand)]"
          >
            {t("common.clearFilters")}
          </button>
        ) : null}
      </div>

      {filteredRooms.length > 0 ? (
        <>
          <DesktopRoomTable rooms={filteredRooms} />
          <MobileRoomList rooms={filteredRooms} />
        </>
      ) : (
        <EmptyState
          title={t("rooms.noMatch")}
          description={t("rooms.noMatchHint")}
          action={
            query || status !== "All" ? (
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
