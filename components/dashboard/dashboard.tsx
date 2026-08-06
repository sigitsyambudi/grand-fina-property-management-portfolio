"use client";

import Link from "next/link";
import { useLocalization } from "@/components/localization/localization-provider";
import { formatBillingPeriod } from "@/components/invoices/invoice-formatters";
import { MaintenancePriorityBadge } from "@/components/maintenance/maintenance-priority-badge";
import { MaintenanceStatusBadge } from "@/components/maintenance/maintenance-status-badge";
import { formatPaymentMethod } from "@/components/payments/payment-formatters";
import { ReportingPeriodSelector } from "@/components/reports/reporting-period-selector";
import { formatIdr, formatRoomDate } from "@/components/rooms/room-formatters";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { DashboardData } from "@/lib/data/derived";
import type { MaintenanceRecord, Room } from "@/lib/data/types";
import { formatRecordText } from "@/lib/i18n/record-text";

type KpiCardProps = {
  label: string;
  value: string;
  detail: string;
};

function KpiCard({ label, value, detail }: KpiCardProps) {
  return (
    <article className="min-w-0 rounded-lg border border-[var(--border)] bg-white p-5 sm:p-6">
      <h3 className="text-xs font-semibold text-[var(--muted)]">{label}</h3>
      <p className="mt-3 break-words text-[clamp(1.35rem,2.2vw,1.875rem)] font-semibold leading-tight tracking-[-0.035em] tabular-nums text-[var(--foreground)]">
        {value}
      </p>
      <p className="mt-4 border-t border-[var(--border)] pt-3 text-[11px] leading-4 text-[var(--muted)]">
        {detail}
      </p>
    </article>
  );
}

function RecentPayments({
  payments,
}: {
  payments: DashboardData["recentPayments"];
}) {
  const { locale, t } = useLocalization();

  return (
    <>
      <div className="hidden lg:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
              <th className="px-5 py-3 font-semibold sm:px-6">
                {t("dashboard.payment")}
              </th>
              <th className="px-4 py-3 font-semibold">
                {t("dashboard.tenantRoom")}
              </th>
              <th className="px-4 py-3 font-semibold">{t("common.date")}</th>
              <th className="px-4 py-3 font-semibold">{t("common.method")}</th>
              <th className="px-5 py-3 text-right font-semibold sm:px-6">
                {t("common.amount")}
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className="border-b border-[var(--border)] last:border-b-0"
              >
                <td className="px-5 py-4 text-xs font-semibold text-[var(--brand)] sm:px-6">
                  <Link href={`/payments/${payment.id}`}>
                    {payment.reference}
                  </Link>
                </td>
                <td className="px-4 py-4">
                  <p className="text-xs font-medium">{payment.tenantName}</p>
                  <p className="mt-1 text-[10px] text-[var(--muted)]">
                    {t("common.roomNumber", { number: payment.roomNumber })}
                  </p>
                </td>
                <td className="px-4 py-4 text-xs text-[var(--muted)]">
                  {formatRoomDate(payment.paymentDate, locale)}
                </td>
                <td className="px-4 py-4 text-xs text-[var(--muted)]">
                  {formatPaymentMethod(payment.method, locale)}
                </td>
                <td className="px-5 py-4 text-right text-xs font-semibold tabular-nums sm:px-6">
                  {formatIdr(payment.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-[var(--border)] lg:hidden">
        {payments.map((payment) => (
          <article key={payment.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link
                  href={`/payments/${payment.id}`}
                  className="text-xs font-semibold text-[var(--brand)]"
                >
                  {payment.reference}
                </Link>
                <p className="mt-1 text-sm font-medium">
                  {payment.tenantName}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {t("common.roomNumber", { number: payment.roomNumber })} ·{" "}
                  {formatPaymentMethod(payment.method, locale)}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {formatIdr(payment.amount)}
              </p>
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">
              {formatRoomDate(payment.paymentDate, locale)}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}

function getMaintenanceLocation(
  record: MaintenanceRecord,
  roomById: ReadonlyMap<string, Room>,
  t: ReturnType<typeof useLocalization>["t"],
): string {
  if (!record.roomId) {
    return t("common.propertyWide");
  }

  const room = roomById.get(record.roomId);

  if (!room) {
    throw new Error(`Missing room for dashboard maintenance ${record.id}.`);
  }

  return t("common.roomNumber", { number: room.roomNumber });
}

export function Dashboard({
  data,
  availablePeriods,
}: {
  data: DashboardData;
  availablePeriods: readonly string[];
}) {
  const { locale, t } = useLocalization();
  const {
    summary: dashboardSummary,
    recentPayments,
    upcomingDueDates: dashboardUpcomingDueDates,
    maintenanceSummary,
    recentMaintenanceRecords,
    rooms,
  } = data;
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const receivedPercent = dashboardSummary.receivedRatio * 100;
  const outstandingPercent = dashboardSummary.outstandingRatio * 100;
  const billingPeriod = formatBillingPeriod(
    dashboardSummary.billingPeriod,
    locale,
  );
  const overview: readonly KpiCardProps[] = [
    {
      label: t("dashboard.totalRooms"),
      value: dashboardSummary.occupancy.total.toString(),
      detail: t("dashboard.canonicalInventory"),
    },
    {
      label: t("dashboard.occupiedRooms"),
      value: dashboardSummary.occupancy.occupied.toString(),
      detail: t("dashboard.occupiedInventory"),
    },
    {
      label: t("dashboard.availableRooms"),
      value: dashboardSummary.occupancy.available.toString(),
      detail: t("dashboard.roomsReady", {
        rooms: dashboardSummary.availableRoomNumbers.join(", "),
      }),
    },
    {
      label: t("dashboard.occupancyRate"),
      value: `${dashboardSummary.occupancy.occupancyRate.toFixed(1)}%`,
      detail: t("dashboard.derivedOccupancy"),
    },
  ];
  const financialMetrics: readonly KpiCardProps[] = [
    {
      label: t("dashboard.activeLeaseValue"),
      value: formatIdr(dashboardSummary.activeLeaseMonthlyValue),
      detail: t("dashboard.contractualValue"),
    },
    {
      label: t("common.totalReceived"),
      value: formatIdr(dashboardSummary.totalReceived),
      detail: t("dashboard.persistedPayments"),
    },
    {
      label: t("common.outstanding"),
      value: formatIdr(dashboardSummary.outstandingBalance),
      detail: t("dashboard.persistedBalance"),
    },
    {
      label: t("dashboard.collectionRate"),
      value: `${receivedPercent.toFixed(1)}%`,
      detail: t("dashboard.collectionRateDescription"),
    },
  ];
  const operationalMetrics: readonly KpiCardProps[] = [
    {
      label: t("dashboard.recordedExpenseLabel"),
      value: formatIdr(dashboardSummary.recordedExpenseAmount),
      detail: t("dashboard.recordedExpenses"),
    },
    {
      label: t("reports.netCashFlow"),
      value: formatIdr(dashboardSummary.netCashFlow),
      detail: t("dashboard.netCashDefinition"),
    },
    {
      label: t("dashboard.maintenanceAttention"),
      value: (maintenanceSummary.open + maintenanceSummary.inProgress).toString(),
      detail: t("dashboard.maintenanceAttentionDescription", {
        urgent: maintenanceSummary.urgent,
      }),
    },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-5 rounded-lg border border-[var(--border)] bg-white p-5 sm:p-6 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-[28px]">
              {t("dashboard.title")}
            </h1>
            <StatusBadge tone="neutral">{t("common.demoData")}</StatusBadge>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {t("dashboard.demoDescription")}
          </p>
        </div>
        <div className="flex w-full flex-col items-start gap-2 lg:w-auto lg:items-end">
          <ReportingPeriodSelector
            action="/"
            periods={availablePeriods}
            selectedPeriod={dashboardSummary.billingPeriod}
          />
          <Link
            href={`/reports?period=${dashboardSummary.billingPeriod}`}
            className="text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4"
          >
            {t("dashboard.viewFullReport")}
          </Link>
        </div>
      </header>

      <section aria-labelledby="property-kpis-heading" className="space-y-3">
        <h2 id="property-kpis-heading" className="text-sm font-semibold">
          {t("dashboard.propertySnapshot")}
        </h2>
        <div className="grid gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4">
          {overview.map((item) => (
            <KpiCard key={item.label} {...item} />
          ))}
        </div>
      </section>

      <section aria-labelledby="financial-summary-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="financial-summary-heading"
              className="text-sm font-semibold text-[var(--foreground)]"
            >
              {t("dashboard.financialPosition")}
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {t("dashboard.financialSubtitle")}
            </p>
          </div>
          <StatusBadge tone="warning">{t("dashboard.persistedDemoData")}</StatusBadge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {financialMetrics.map((metric) => (
            <KpiCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <section aria-labelledby="operational-summary-heading" className="space-y-3">
        <div>
          <h2 id="operational-summary-heading" className="text-sm font-semibold">
            {t("dashboard.operationalSummary")}
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {t("dashboard.operationalSummaryDescription")}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {operationalMetrics.map((metric) => (
            <KpiCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.85fr)]">
        <SectionCard
          title={t("dashboard.billingPosition", { period: billingPeriod })}
          description={t("dashboard.billingPositionDescription")}
          action={
            <Link
              href="/invoices"
              className="text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4"
            >
              {t("reports.viewInvoices")}
            </Link>
          }
        >
          <div className="p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  {t("common.totalBilled")}
                </p>
                <p className="mt-2 text-lg font-semibold tabular-nums">
                  {formatIdr(dashboardSummary.totalBilled)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  {t("common.received")}
                </p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-[#256148]">
                  {formatIdr(dashboardSummary.totalReceived)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  {t("common.outstanding")}
                </p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-[var(--danger)]">
                  {formatIdr(dashboardSummary.outstandingBalance)}
                </p>
              </div>
            </div>

            <div className="mt-7">
              <div
                className="flex h-3 overflow-hidden rounded-sm bg-[#edf0ee]"
                aria-label={t("dashboard.collectionSplitAria", { received: receivedPercent.toFixed(1), outstanding: outstandingPercent.toFixed(1) })}
              >
                <div
                  className="h-full bg-[var(--brand)]"
                  style={{ width: `${receivedPercent}%` }}
                />
                <div
                  className="h-full bg-[#c9a766]"
                  style={{ width: `${outstandingPercent}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap justify-between gap-3 text-xs text-[var(--muted)]">
                <span>{t("dashboard.receivedPercent", { value: receivedPercent.toFixed(1) })}</span>
                <span>{t("dashboard.outstandingPercent", { value: outstandingPercent.toFixed(1) })}</span>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title={t("dashboard.billingAttention")}
          description={t("dashboard.billingAttentionDescription")}
        >
          <div className="p-5 sm:p-6">
            <p className="text-2xl font-semibold tracking-[-0.04em] text-[var(--danger)]">
              {formatIdr(dashboardSummary.outstandingBalance)}
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {t("dashboard.totalOutstanding")}
            </p>
            <dl className="mt-6 divide-y divide-[var(--border)] border-t border-[var(--border)]">
              {[
                {
                  label: t("dashboard.overdueInvoices"),
                  value: dashboardSummary.overdueInvoiceCount,
                },
                {
                  label: t("common.status.partiallyPaid"),
                  value: dashboardSummary.partiallyPaidInvoiceCount,
                },
                {
                  label: t("dashboard.issuedUnpaid"),
                  value: dashboardSummary.issuedInvoiceCount,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <dt className="text-xs text-[var(--muted)]">{item.label}</dt>
                  <dd className="text-sm font-semibold tabular-nums">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.85fr)]">
        <SectionCard
          title={t("dashboard.recentPayments")}
          description={t("dashboard.recentPaymentsDescription")}
          action={
            <Link
              href="/payments"
              className="hidden text-xs font-semibold text-[var(--brand)] sm:block"
            >
              {t("common.viewAll")}
            </Link>
          }
        >
          <RecentPayments payments={recentPayments} />
        </SectionCard>

        <SectionCard
          title={t("dashboard.upcomingDueDates")}
          description={t("dashboard.upcomingDescription")}
        >
          {dashboardUpcomingDueDates.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {dashboardUpcomingDueDates.map((item) => (
                <div key={item.dueDate} className="px-5 py-5 sm:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">
                        {t("dashboard.invoicesDue", {
                          count: item.invoiceCount,
                        })}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {formatRoomDate(item.dueDate, locale)}
                      </p>
                    </div>
                    <StatusBadge tone="warning">
                      {t("common.status.upcoming")}
                    </StatusBadge>
                  </div>
                  <p className="mt-4 text-lg font-semibold tabular-nums">
                    {formatIdr(item.balance)}
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
                    {t("dashboard.issuedPartial", {
                      issued: item.issuedCount,
                      partial: item.partiallyPaidCount,
                    })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 sm:p-6">
              <p className="text-sm font-semibold">
                {t("dashboard.noUpcoming")}
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {t("dashboard.noUpcomingDescription")}
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title={t("dashboard.maintenance")}
        description={t("dashboard.maintenanceDescription")}
        action={
          <Link
            href="/maintenance"
            className="text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4 hover:decoration-[var(--brand)]"
          >
            {t("common.viewAll")}
          </Link>
        }
      >
        <div className="grid border-b border-[var(--border)] sm:grid-cols-3">
          {[
            { label: t("dashboard.openIssues"), value: maintenanceSummary.open },
            {
              label: t("common.status.inProgress"),
              value: maintenanceSummary.inProgress,
            },
            {
              label: t("dashboard.urgentAttention"),
              value: maintenanceSummary.urgent,
            },
          ].map((metric, index) => (
            <div
              key={metric.label}
              className={`p-5 sm:p-6 ${
                index < 2
                  ? "border-b border-[var(--border)] sm:border-b-0 sm:border-r"
                  : ""
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                {metric.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <div className="divide-y divide-[var(--border)]">
          {recentMaintenanceRecords.map((record) => (
            <article
              key={record.id}
              className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              <div className="min-w-0">
                <Link
                  href={`/maintenance/${record.reference}`}
                  className="text-xs font-semibold text-[var(--brand)]"
                >
                  {record.reference}
                </Link>
                <p className="mt-1 text-sm font-semibold">{formatRecordText(record.title, locale)}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {t("dashboard.reported", {
                    location: getMaintenanceLocation(record, roomById, t),
                    date: formatRoomDate(record.reportedDate, locale),
                  })}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <MaintenancePriorityBadge priority={record.priority} />
                <MaintenanceStatusBadge status={record.status} />
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <section
        aria-label={t("settings.dataClassification")}
        className="grid border border-[var(--border)] bg-white sm:grid-cols-2"
      >
        <div className="border-b border-[var(--border)] p-5 sm:border-b-0 sm:border-r sm:p-6">
          <p className="text-xs font-semibold text-[var(--foreground)]">
            {t("dashboard.canonicalState")}
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            {t("dashboard.canonicalDescription")}
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs font-semibold text-[var(--foreground)]">
            {t("dashboard.fictionalState")}
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            {t("dashboard.fictionalDescription")}
          </p>
        </div>
      </section>
    </div>
  );
}
