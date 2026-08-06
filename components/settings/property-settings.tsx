"use client";

import { LanguageSelector } from "@/components/localization/language-selector";
import { useLocalization } from "@/components/localization/localization-provider";
import { formatPaymentMethod } from "@/components/payments/payment-formatters";
import {
  formatIdr,
  formatRoomDate,
} from "@/components/rooms/room-formatters";
import { SectionCard } from "@/components/ui/section-card";
import type { SettingsData } from "@/lib/data/derived";
import type { InvoiceStatus } from "@/lib/data/types";
import { formatDisplayValue } from "@/lib/i18n/display-values";
import type { Locale, TranslationKey } from "@/lib/i18n/types";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatBillingPeriod(period: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${period}-01T00:00:00Z`));
}

const invoiceStatusKeys: Record<InvoiceStatus, TranslationKey> = {
  draft: "common.status.draft",
  issued: "common.status.issued",
  partially_paid: "common.status.partial",
  paid: "common.status.paid",
  overdue: "common.status.overdue",
  void: "common.status.void",
};

function DefinitionList({
  items,
}: {
  items: readonly {
    label: string;
    value: string;
    detail?: string;
  }[];
}) {
  return (
    <dl className="divide-y divide-[var(--border)]">
      {items.map((item) => (
        <div
          key={item.label}
          className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_1fr] sm:gap-5 sm:px-6"
        >
          <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            {item.label}
          </dt>
          <dd className="min-w-0 text-sm font-semibold">
            {item.value}
            {item.detail ? (
              <span className="mt-1 block text-[10px] font-normal leading-4 text-[var(--muted)]">
                {item.detail}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SummaryGrid({
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

export function PropertySettings({ data }: { data: SettingsData }) {
  const { locale, t } = useLocalization();
  const {
    applicationConfiguration,
    billingConfiguration,
    moduleReadiness,
    occupancyConfiguration,
    propertyStructure,
    rentalConfiguration,
  } = data;

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            {t("settings.propertyConfiguration")}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
            {t("settings.propertySettings")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {t("settings.subtitle")}
          </p>
        </div>
        <div className="shrink-0 border-l-2 border-[var(--accent)] bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            {t("settings.currentMilestone")}
          </p>
          <p className="mt-1 text-sm font-semibold">
            {t("settings.readOnlyOverview")}
          </p>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard
          title={t("settings.propertyProfile")}
          description={t("settings.profileDescription")}
        >
          <DefinitionList
            items={[
              {
                label: t("settings.propertyName"),
                value: applicationConfiguration.propertyName,
                detail: t("settings.propertyIdentityDetail"),
              },
              {
                label: t("settings.propertyType"),
                value: formatDisplayValue(applicationConfiguration.propertyType, locale),
                detail: t("settings.propertyTypeDetail"),
              },
              {
                label: t("dashboard.totalRooms"),
                value: occupancyConfiguration.totalRooms.toString(),
                detail: t("settings.inventoryDerived"),
              },
              {
                label: t("settings.timezone"),
                value: `${applicationConfiguration.timezone} / ${applicationConfiguration.displayTimezone}`,
              },
              {
                label: t("settings.currency"),
                value: `${formatDisplayValue(applicationConfiguration.currencyName, locale)} (${applicationConfiguration.currencyCode})`,
              },
            ]}
          />
        </SectionCard>

        <SectionCard
          title={t("settings.regionalFormatting")}
          description={t("settings.regionalDescription")}
        >
          <DefinitionList
            items={[
              {
                label: t("settings.timezone"),
                value: applicationConfiguration.timezone,
              },
              {
                label: t("settings.displayTimezone"),
                value: applicationConfiguration.displayTimezone,
              },
              {
                label: t("settings.currencyCode"),
                value: applicationConfiguration.currencyCode,
              },
              {
                label: t("settings.currencyExample"),
                value: formatIdr(1_700_000),
              },
              {
                label: t("settings.dateExample"),
                value: formatRoomDate("2026-07-26", locale),
              },
            ]}
          />
          <div className="flex flex-col gap-3 border-t border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                {t("settings.currentLanguage")}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {t(`language.${locale}`)}
              </p>
              <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
                {t("settings.languageDescription")}
              </p>
            </div>
            <LanguageSelector />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title={t("settings.propertyStructure")}
        description={t("settings.structureDescription")}
      >
        <div className="grid gap-px bg-[var(--border)] lg:grid-cols-3">
          {propertyStructure.map((area) => (
            <article key={area.location} className="bg-white p-5 sm:p-6">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-sm font-semibold">
                  {formatDisplayValue(area.location, locale)}
                </h3>
                <p className="shrink-0 text-xs font-semibold tabular-nums text-[var(--brand)]">
                  {t("common.roomsCount", { count: area.totalRooms })}
                </p>
              </div>
              <div className="mt-5 space-y-5">
                {area.roomGroups.map((group) => (
                  <div key={group.label}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                        {formatDisplayValue(group.label, locale)}
                      </p>
                      <p className="text-[10px] font-semibold text-[var(--muted)]">
                        {group.count}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {group.roomNumbers.map((roomNumber) => (
                        <span
                          key={roomNumber}
                          className="inline-flex min-w-8 justify-center border border-[var(--border)] bg-[var(--surface-subtle)] px-2 py-1 text-[10px] font-semibold tabular-nums"
                        >
                          {roomNumber}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold">{t("settings.roomInventory")}</p>
          <p className="text-sm font-semibold tabular-nums">
            {t("settings.roomsTotal", { count: occupancyConfiguration.totalRooms })}
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title={t("settings.currentOccupancy")}
        description={t("settings.occupancyDescription")}
      >
        <SummaryGrid
          metrics={[
            {
              label: t("dashboard.totalRooms"),
              value: occupancyConfiguration.totalRooms.toString(),
              detail: t("settings.canonicalInventory"),
            },
            {
              label: t("common.status.occupied"),
              value: occupancyConfiguration.occupiedRooms.toString(),
              detail: t("settings.currentRoomStatus"),
            },
            {
              label: t("common.status.available"),
              value: occupancyConfiguration.availableRooms.toString(),
              detail: t("settings.availableRoomsList", {
                rooms: occupancyConfiguration.availableRoomNumbers.join(", "),
              }),
            },
            {
              label: t("dashboard.occupancyRate"),
              value: formatPercent(occupancyConfiguration.occupancyRate),
              detail: t("settings.occupancyCalculated"),
            },
          ]}
        />
        <div className="px-5 py-4 sm:px-6">
          <p className="text-xs leading-5 text-[var(--muted)]">
            {t("settings.occupancyWorkflowBoundary")}
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title={t("settings.rentalConfiguration")}
        description={t("settings.rentalDescription")}
      >
        <div className="grid border-b border-[var(--border)] sm:grid-cols-3">
          {[
            {
              label: t("settings.fullOccupancyPotential"),
              value: rentalConfiguration.fullOccupancyPotential,
              detail: t("settings.sumRoomRates"),
            },
            {
              label: t("settings.activeLeaseValue"),
              value: rentalConfiguration.activeLeaseMonthlyValue,
              detail: t("settings.currentContractValue"),
            },
            {
              label: t("settings.vacancyImpact"),
              value: rentalConfiguration.vacancyImpact,
              detail: t("settings.vacantRoomRates"),
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
              <p className="mt-2 whitespace-nowrap text-xl font-semibold tracking-[-0.03em] tabular-nums">
                {formatIdr(metric.value)}
              </p>
              <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
                {metric.detail}
              </p>
            </div>
          ))}
        </div>
        <div className="p-5 sm:p-6">
          <h3 className="text-xs font-semibold">{t("settings.rateTiers")}</h3>
          <div className="mt-4 grid gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
            {rentalConfiguration.rateTiers.map((tier) => (
              <div
                key={tier.monthlyRate}
                className="flex items-center justify-between gap-3 bg-white p-3"
              >
                <span className="whitespace-nowrap text-xs font-semibold tabular-nums">
                  {formatIdr(tier.monthlyRate)}
                </span>
                <span className="text-[10px] text-[var(--muted)]">
                  {t("common.roomsCount", { count: tier.roomCount })}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[10px] leading-4 text-[var(--muted)]">
            {t("settings.rentalFiguresBoundary")}
          </p>
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard
          title={t("settings.billingConventions")}
          description={t("settings.billingDescription")}
        >
          <DefinitionList
            items={[
              {
                label: t("settings.billingCurrency"),
                value: applicationConfiguration.currencyCode,
              },
              {
                label: t("settings.demoPeriod"),
                value: formatBillingPeriod(
                  billingConfiguration.demoBillingPeriod,
                  locale,
                ),
                detail: t("settings.demoPeriodDetail"),
              },
              {
                label: t("settings.leaseBillingDays"),
                value: billingConfiguration.hasLeaseBillingDays
                  ? t("settings.enabledDemoModel")
                  : t("settings.notRepresented"),
                detail: t("settings.leaseTimingDetail"),
              },
              {
                label: t("settings.invoiceLifecycle"),
                value: billingConfiguration.invoiceLifecycle
                  .map((status) => t(invoiceStatusKeys[status]))
                  .join(" · "),
              },
              {
                label: t("settings.paymentMethods"),
                value: billingConfiguration.paymentMethods
                  .map((method) => formatPaymentMethod(method, locale))
                  .join(" · "),
                detail: t("settings.paymentMethodsDetail"),
              },
            ]}
          />
        </SectionCard>

        <SectionCard
          title={t("settings.applicationMode")}
          description={t("settings.applicationDescription")}
        >
          <DefinitionList
            items={[
              {
                label: t("settings.applicationModeLabel"),
                value: formatDisplayValue(applicationConfiguration.applicationMode, locale),
              },
              {
                label: t("settings.dataPersistence"),
                value: formatDisplayValue(applicationConfiguration.persistenceStatus, locale),
              },
              {
                label: t("settings.authentication"),
                value: formatDisplayValue(applicationConfiguration.authenticationStatus, locale),
              },
              {
                label: t("settings.database"),
                value: formatDisplayValue(applicationConfiguration.databaseStatus, locale),
              },
              {
                label: t("settings.crud"),
                value: formatDisplayValue(applicationConfiguration.crudStatus, locale),
                detail: t("settings.roleWriteBoundary"),
              },
            ]}
          />
        </SectionCard>
      </div>

      <SectionCard
        title={t("settings.dataClassification")}
        description={t("settings.classificationDescription")}
      >
        <div className="grid gap-px bg-[var(--border)] md:grid-cols-2">
          <div className="bg-white p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
              {t("settings.canonicalState")}
            </p>
            <ul className="mt-4 space-y-2 text-xs leading-5 text-[var(--muted)]">
              {[
                t("settings.canonicalPropertyNameInventory"),
                t("settings.canonicalRoomConfiguration"),
                t("settings.canonicalOccupancy"),
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true" className="text-[var(--brand)]">
                    —
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
              {t("settings.fictionalState")}
            </p>
            <ul className="mt-4 space-y-2 text-xs leading-5 text-[var(--muted)]">
              {[
                t("settings.fictionalTenantData"),
                t("settings.fictionalLeaseData"),
                t("settings.fictionalInvoicePaymentData"),
                t("settings.fictionalExpenseData"),
                t("settings.fictionalMaintenanceData"),
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true" className="text-[var(--accent)]">
                    —
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={t("settings.moduleStatus")}
        description={t("settings.moduleStatusDescription")}
      >
        <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2">
          {moduleReadiness.map((item) => (
            <div
              key={item.module}
              className="flex items-center justify-between gap-4 bg-white px-5 py-4 sm:px-6"
            >
              <p className="text-xs font-semibold">
                {formatDisplayValue(item.module, locale)}
              </p>
              <p className="max-w-[65%] text-right text-[10px] leading-4 text-[var(--muted)]">
                {formatDisplayValue(item.status, locale)}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <section className="border border-[var(--border)] bg-[var(--brand-strong)] p-5 text-white sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d6bc86]">
          {t("settings.nextPhase")}
        </p>
        <h2 className="mt-2 text-lg font-semibold">
          {t("settings.connectedWriteLayers")}
        </h2>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-[#aab9b3]">
          {t("settings.connectedWriteDescription")}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            t("settings.capability.authenticatedReads"),
            t("settings.capability.propertyRls"),
            t("settings.capability.ownerAdminWrites"),
            t("settings.capability.staffReadOnly"),
            t("settings.capability.validatedFinancial"),
          ].map((capability) => (
            <span
              key={capability}
              className="border border-white/15 bg-white/5 px-2.5 py-1.5 text-[10px] font-medium text-[#dce5e1]"
            >
              {capability}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
