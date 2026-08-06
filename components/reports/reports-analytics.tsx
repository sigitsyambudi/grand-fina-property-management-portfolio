"use client";

import Link from "next/link";
import { formatExpenseCategory } from "@/components/expenses/expense-formatters";
import { formatBillingPeriod } from "@/components/invoices/invoice-formatters";
import { useLocalization } from "@/components/localization/localization-provider";
import { formatMaintenanceCategory } from "@/components/maintenance/maintenance-formatters";
import { ReportingPeriodSelector } from "@/components/reports/reporting-period-selector";
import { formatIdr } from "@/components/rooms/room-formatters";
import { SectionCard } from "@/components/ui/section-card";
import type { ReportsData } from "@/lib/data/derived";
import { formatDisplayValue } from "@/lib/i18n/display-values";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function MetricGrid({
  metrics,
}: {
  metrics: readonly {
    label: string;
    value: string;
    detail: string;
  }[];
}) {
  return (
    <div className="grid grid-cols-2 border-b border-[var(--border)] lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <div
          key={metric.label}
          className={`min-w-0 p-4 sm:p-5 ${
            index < 2 ? "border-b border-[var(--border)] lg:border-b-0" : ""
          } ${index % 2 === 0 ? "border-r border-[var(--border)]" : ""} ${
            index === 1 || index === 2 ? "lg:border-r" : ""
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            {metric.label}
          </p>
          <p className="mt-2 whitespace-nowrap text-lg font-semibold tracking-[-0.03em] tabular-nums sm:text-xl">
            {metric.value}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
            {metric.detail}
          </p>
        </div>
      ))}
    </div>
  );
}

function DistributionBar({
  label,
  value,
  total,
  detail,
}: {
  label: string;
  value: number;
  total: number;
  detail: string;
}) {
  const percentage = total === 0 ? 0 : value / total;

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold">{label}</p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
            {detail}
          </p>
        </div>
        <p className="shrink-0 text-xs font-semibold tabular-nums">
          {formatPercent(percentage)}
        </p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden bg-[#e6e9e6]"
        aria-label={`${label}: ${formatPercent(percentage)}`}
      >
        <div
          className="h-full bg-[var(--brand)]"
          style={{ width: `${percentage * 100}%` }}
        />
      </div>
    </div>
  );
}

export function ReportsAnalytics({
  data,
  availablePeriods,
}: {
  data: ReportsData;
  availablePeriods: readonly string[];
}) {
  const { locale, t } = useLocalization();
  const {
    attentionReport,
    billingReport,
    cashPositionReport,
    expenseReport,
    maintenanceReport,
    propertyReport,
    rentalReport,
  } = data;
  const maxExpenseCategory = Math.max(
    ...expenseReport.categoryBreakdown.map((item) => item.amount),
    1,
  );
  const maxMaintenanceCategory = Math.max(
    ...maintenanceReport.categoryBreakdown.map((item) => item.count),
    1,
  );
  const reportingPeriod = formatBillingPeriod(
    billingReport.billingPeriod,
    locale,
  );
  const attentionItems = [
    {
      label: t("dashboard.availableRooms"),
      value: attentionReport.availableRooms,
      detail: t("reports.roomsReady", {
        rooms: attentionReport.availableRoomNumbers.join(", "),
      }),
      href: "/rooms?status=Available",
    },
    {
      label: t("dashboard.overdueInvoices"),
      value: attentionReport.overdueInvoices,
      detail: t("reports.pastDueBalances"),
      href: "/invoices?status=overdue",
    },
    {
      label: t("common.status.partiallyPaid"),
      value: attentionReport.partiallyPaidInvoices,
      detail: t("reports.partialBalances"),
      href: "/invoices?status=partially_paid",
    },
    {
      label: t("reports.urgentMaintenance"),
      value: attentionReport.urgentMaintenance,
      detail: t("reports.activeUrgentMaintenance"),
      href: "/maintenance?priority=urgent",
    },
    {
      label: t("expenses.pending"),
      value: attentionReport.pendingExpenses,
      detail: t("reports.pendingExpenseAttention"),
      href: "/expenses?status=pending",
    },
  ] as const;

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            {t("reports.overview")}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
            {t("reports.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {t("reports.subtitle")}
          </p>
        </div>
        <ReportingPeriodSelector
          action="/reports"
          periods={availablePeriods}
          selectedPeriod={billingReport.billingPeriod}
        />
      </header>

      <div className="grid gap-5 2xl:grid-cols-2">
        <SectionCard
          title={t("reports.propertyPerformance")}
          description={t("reports.propertyDescription")}
        >
          <MetricGrid
            metrics={[
              {
                label: t("dashboard.totalRooms"),
                value: propertyReport.totalRooms.toString(),
                detail: t("reports.canonicalInventory"),
              },
              {
                label: t("common.status.occupied"),
                value: propertyReport.occupiedRooms.toString(),
                detail: t("reports.currentRoomStatus"),
              },
              {
                label: t("common.status.available"),
                value: propertyReport.availableRooms.toString(),
                detail: t("reports.roomsList", {
                  rooms: propertyReport.availableRoomNumbers.join(", "),
                }),
              },
              {
                label: t("dashboard.occupancyRate"),
                value: formatPercent(propertyReport.occupancyRate),
                detail: t("reports.occupancyDefinition"),
              },
            ]}
          />
          <div className="space-y-5 p-5 sm:p-6">
            {propertyReport.areas.map((area) => (
              <DistributionBar
                key={area.location}
                label={formatDisplayValue(area.location, locale)}
                value={area.occupied}
                total={area.total}
                detail={t("reports.areaOccupancy", {
                  occupied: area.occupied,
                  available: area.available,
                  total: area.total,
                })}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title={t("reports.rentalPosition")}
          description={t("reports.rentalDescription")}
        >
          <MetricGrid
            metrics={[
              {
                label: t("tenants.active"),
                value: rentalReport.activeTenants.toString(),
                detail: t("reports.tenantRelationships"),
              },
              {
                label: t("leases.active"),
                value: rentalReport.activeLeases.toString(),
                detail: t("reports.oneLeasePerOccupiedRoom"),
              },
              {
                label: t("dashboard.activeLeaseValue"),
                value: formatIdr(rentalReport.activeLeaseMonthlyValue),
                detail: t("dashboard.contractualValue"),
              },
              {
                label: t("reports.vacancyImpact"),
                value: formatIdr(rentalReport.vacancyImpact),
                detail: t("reports.availableRoomRates"),
              },
            ]}
          />
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div className="border-l-2 border-[var(--brand)] pl-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                {t("reports.fullPotential")}
              </p>
              <p className="mt-2 whitespace-nowrap text-xl font-semibold tabular-nums">
                {formatIdr(rentalReport.fullOccupancyPotential)}
              </p>
              <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
                {t("reports.potentialDefinition")}
              </p>
            </div>
            <div className="border-l-2 border-[var(--accent)] pl-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                {t("reports.currentMonthlyPosition")}
              </p>
              <p className="mt-2 whitespace-nowrap text-xl font-semibold tabular-nums">
                {formatIdr(rentalReport.activeLeaseMonthlyValue)}
              </p>
              <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
                {t("reports.activeRentDefinition")}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title={t("reports.billingCollection")}
        description={t("reports.billingDescription", {
          period: reportingPeriod,
        })}
        action={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/invoices"
              className="text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4"
            >
              {t("reports.viewInvoices")}
            </Link>
            <Link
              href="/payments"
              className="text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4"
            >
              {t("reports.viewPayments")}
            </Link>
          </div>
        }
      >
        <MetricGrid
          metrics={[
            {
              label: t("common.totalBilled"),
              value: formatIdr(billingReport.totalBilled),
              detail: t("reports.persistedInvoiceRecords"),
            },
            {
              label: t("common.totalReceived"),
              value: formatIdr(billingReport.totalReceived),
              detail: t("reports.persistedCompletedPayments"),
            },
            {
              label: t("common.outstanding"),
              value: formatIdr(billingReport.outstandingBalance),
              detail: t("reports.derivedInvoiceBalances"),
            },
            {
              label: t("reports.collectionRate"),
              value: formatPercent(billingReport.collectionRate),
              detail: t("reports.collectionDefinition"),
            },
          ]}
        />
        <div className="grid gap-6 p-5 lg:grid-cols-[1.15fr_0.85fr] sm:p-6">
          <DistributionBar
            label={t("reports.collectionProgress", {
              period: reportingPeriod,
            })}
            value={billingReport.totalReceived}
            total={billingReport.totalBilled}
            detail={t("reports.receivedOfBilled", {
              received: formatIdr(billingReport.totalReceived),
              billed: formatIdr(billingReport.totalBilled),
            })}
          />
          <div className="grid grid-cols-2 gap-px bg-[var(--border)]">
            {[
              [t("common.status.paid"), billingReport.statusCounts.paid],
              [t("common.status.partial"), billingReport.statusCounts.partiallyPaid],
              [t("common.status.issued"), billingReport.statusCounts.issued],
              [t("common.status.overdue"), billingReport.statusCounts.overdue],
            ].map(([label, value]) => (
              <div key={label} className="bg-white p-3">
                <p className="text-[10px] font-medium text-[var(--muted)]">
                  {label}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-5 2xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title={t("reports.expenseAnalysis")}
          description={t("reports.expenseDescription", {
            period: reportingPeriod,
          })}
          action={
            <Link
              href="/expenses"
              className="text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4"
            >
              {t("reports.viewExpenses")}
            </Link>
          }
        >
          <MetricGrid
            metrics={[
              {
                label: t("reports.operational"),
                value: formatIdr(expenseReport.operationalAmount),
                detail: t("reports.recordedPlusPending"),
              },
              {
                label: t("common.status.recorded"),
                value: formatIdr(expenseReport.recordedAmount),
                detail: t("reports.persistedRecordCount", {
                  count: expenseReport.recordedCount,
                }),
              },
              {
                label: t("common.status.pending"),
                value: formatIdr(expenseReport.pendingAmount),
                detail: t("reports.awaitingCompletion", {
                  count: expenseReport.pendingCount,
                }),
              },
              {
                label: t("common.status.void"),
                value: expenseReport.voidCount.toString(),
                detail: t("reports.excludedFromTotals"),
              },
            ]}
          />
          <div className="space-y-4 p-5 sm:p-6">
            {expenseReport.categoryBreakdown.map((item) => (
              <div key={item.category}>
                <div className="flex justify-between gap-4 text-xs">
                  <span className="font-medium">
                    {formatExpenseCategory(item.category, locale)}
                  </span>
                  <span className="whitespace-nowrap font-semibold tabular-nums">
                    {formatIdr(item.amount)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 bg-[#e6e9e6]">
                  <div
                    className="h-full bg-[var(--brand)]"
                    style={{
                      width: `${(item.amount / maxExpenseCategory) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title={t("reports.cashPosition")}
          description={t("reports.cashDescription", {
            period: reportingPeriod,
          })}
        >
          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <p className="text-xs font-semibold">
                  {t("reports.completedPayments")}
                </p>
                <p className="mt-1 text-[10px] text-[var(--muted)]">
                  {t("reports.paymentDateBasis", { period: reportingPeriod })}
                </p>
              </div>
              <p className="whitespace-nowrap text-sm font-semibold tabular-nums">
                {formatIdr(cashPositionReport.completedPayments)}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <p className="text-xs font-semibold">
                  {t("reports.lessRecordedExpenses")}
                </p>
                <p className="mt-1 text-[10px] text-[var(--muted)]">
                  {t("reports.pendingVoidExcluded")}
                </p>
              </div>
              <p className="whitespace-nowrap text-sm font-semibold tabular-nums">
                − {formatIdr(cashPositionReport.includedRecordedExpenses)}
              </p>
            </div>
            <div className="bg-[var(--brand-soft)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                {t("reports.netCashFlow")}
              </p>
              <p className="mt-2 whitespace-nowrap text-2xl font-semibold tabular-nums text-[var(--brand-strong)]">
                {formatIdr(cashPositionReport.netOperatingCashPosition)}
              </p>
            </div>
            <p className="text-[10px] leading-5 text-[var(--muted)]">
              {t("reports.cashBoundary")}
            </p>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title={t("reports.maintenanceAnalytics")}
        description={t("reports.maintenanceDescription")}
        action={
          <Link
            href="/maintenance"
            className="text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4"
          >
            {t("reports.viewMaintenance")}
          </Link>
        }
      >
        <div className="grid grid-cols-2 border-b border-[var(--border)] sm:grid-cols-3 lg:grid-cols-5">
          {[
            [t("common.status.open"), maintenanceReport.open],
            [t("common.status.inProgress"), maintenanceReport.inProgress],
            [t("common.status.completed"), maintenanceReport.completed],
            [t("common.status.cancelled"), maintenanceReport.cancelled],
            [t("maintenance.urgentAttention"), maintenanceReport.urgent],
          ].map(([label, value], index) => (
            <div
              key={label}
              className={`p-4 sm:p-5 ${
                index < 4 ? "border-r border-[var(--border)]" : ""
              } ${index < 3 ? "border-b border-[var(--border)] lg:border-b-0" : ""}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {label}
              </p>
              <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-6 p-5 md:grid-cols-[0.7fr_1.3fr] sm:p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--surface-subtle)] p-4">
              <p className="text-[10px] text-[var(--muted)]">
                {t("common.roomSpecific")}
              </p>
              <p className="mt-2 text-xl font-semibold tabular-nums">
                {maintenanceReport.roomSpecific}
              </p>
            </div>
            <div className="bg-[var(--surface-subtle)] p-4">
              <p className="text-[10px] text-[var(--muted)]">
                {t("common.propertyWide")}
              </p>
              <p className="mt-2 text-xl font-semibold tabular-nums">
                {maintenanceReport.propertyWide}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {maintenanceReport.categoryBreakdown.map((item) => (
              <div
                key={item.category}
                className="grid grid-cols-[7rem_1fr_1.5rem] items-center gap-3 text-xs sm:grid-cols-[9rem_1fr_1.5rem]"
              >
                <span className="truncate font-medium">
                  {formatMaintenanceCategory(item.category, locale)}
                </span>
                <div className="h-1.5 bg-[#e6e9e6]">
                  <div
                    className="h-full bg-[var(--accent)]"
                    style={{
                      width: `${(item.count / maxMaintenanceCategory) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-right font-semibold tabular-nums">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={t("reports.managementAttention")}
        description={t("reports.attentionDescription")}
      >
        <div className="divide-y divide-[var(--border)]">
          {attentionItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group flex min-h-16 items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--surface-subtle)] sm:px-6"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold">{item.label}</p>
                <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
                  {item.detail}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-lg font-semibold tabular-nums">
                  {item.value}
                </span>
                <span
                  aria-hidden="true"
                  className="text-[var(--brand)] transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </SectionCard>

      <section className="grid gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2">
        <div className="bg-white p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
            {t("classification.canonical")}
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            {t("reports.canonicalBoundary")}
          </p>
        </div>
        <div className="bg-white p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
            {t("classification.fictionalActivity")}
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            {t("reports.demoBoundary")}
          </p>
        </div>
      </section>
    </div>
  );
}
