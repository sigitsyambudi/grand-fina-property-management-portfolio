"use client";

import { useLocalization } from "@/components/localization/localization-provider";
import { GrandFinaLogo } from "@/components/layout/grand-fina-logo";
import { SectionCard } from "@/components/ui/section-card";
import { applicationIdentity } from "@/lib/application-identity";

function DefinitionList({
  items,
}: {
  items: readonly { label: string; value: string }[];
}) {
  return (
    <dl className="divide-y divide-[var(--border)]">
      {items.map((item) => (
        <div
          key={item.label}
          className="grid gap-1 px-5 py-4 sm:grid-cols-[9rem_1fr] sm:gap-5 sm:px-6"
        >
          <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            {item.label}
          </dt>
          <dd className="min-w-0 text-sm font-semibold text-[var(--foreground)]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AboutPage() {
  const { t } = useLocalization();
  const summary = applicationIdentity.systemSummary;
  const applicationInformation = [
    {
      label: t("about.application"),
      value: applicationIdentity.applicationName,
    },
    {
      label: t("about.edition"),
      value: t(applicationIdentity.editionKey),
    },
    {
      label: t("about.version"),
      value: applicationIdentity.version,
    },
    {
      label: t("about.release"),
      value: t(applicationIdentity.releaseKey),
    },
    {
      label: t("about.environment"),
      value: t(applicationIdentity.environmentKey),
    },
    {
      label: t("about.status"),
      value: t(applicationIdentity.statusKey),
    },
  ];
  const summaryItems = [
    { label: t("about.rooms"), value: summary.rooms },
    { label: t("about.roles"), value: summary.applicationRoles },
    { label: t("about.languages"), value: summary.supportedLanguages },
    { label: t("about.rlsTables"), value: summary.rlsProtectedTables },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="border-b border-[var(--border)] pb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
            <GrandFinaLogo placement="about" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                {t("about.productIdentity")}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-3xl">
                {applicationIdentity.applicationName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                {t(applicationIdentity.descriptionKey)}
              </p>
            </div>
          </div>
          <div className="shrink-0 border-l-2 border-[var(--accent)] bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              {t("about.edition")}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--brand)]">
              {t(applicationIdentity.editionKey)}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title={t("about.overviewTitle")}>
          <p className="px-5 py-5 text-sm leading-7 text-[var(--muted)] sm:px-6">
            {t(applicationIdentity.overviewKey)}
          </p>
        </SectionCard>

        <SectionCard title={t("about.applicationInformation")}>
          <DefinitionList items={applicationInformation} />
        </SectionCard>

        <SectionCard
          title={t("about.developmentCredit")}
          className="xl:col-span-2"
        >
          <div className="grid gap-5 px-5 py-5 sm:grid-cols-[minmax(0,16rem)_1fr] sm:px-6">
            <div className="border-l-2 border-[var(--accent)] pl-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                {t(applicationIdentity.developerRoleKey)}
              </p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                {applicationIdentity.leadDeveloper}
              </p>
            </div>
            <p className="text-sm leading-7 text-[var(--muted)]">
              {t(applicationIdentity.developmentDescriptionKey)}
            </p>
          </div>
        </SectionCard>

        <SectionCard title={t("about.technologyStack")}>
          <ul className="flex flex-wrap gap-2 px-5 py-5 sm:px-6">
            {applicationIdentity.technologyStack.map((technology) => (
              <li
                key={technology}
                className="border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--brand)]"
              >
                {technology}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title={t("about.platformCapabilities")}>
          <ul className="grid gap-px bg-[var(--border)] sm:grid-cols-2">
            {applicationIdentity.capabilityKeys.map((key) => (
              <li
                key={key}
                className="flex items-start gap-2 bg-white px-5 py-3 text-xs font-medium leading-5 text-[var(--foreground)]"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                />
                {t(key)}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title={t("about.systemSummary")}
        description={t("about.systemSummaryDescription")}
      >
        <div className="grid grid-cols-2 border-b border-[var(--border)] lg:grid-cols-4">
          {summaryItems.map((item, index) => (
            <div
              key={item.label}
              className={`min-w-0 p-4 sm:p-5 ${
                index < 2 ? "border-b border-[var(--border)] lg:border-b-0" : ""
              } ${index % 2 === 0 ? "border-r border-[var(--border)]" : ""} ${
                index === 1 || index === 2 ? "lg:border-r" : ""
              }`}
            >
              <p className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                {item.value}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                {item.label}
              </p>
            </div>
          ))}
        </div>
        <p className="px-5 py-4 text-xs leading-5 text-[var(--muted)] sm:px-6">
          {t(applicationIdentity.personasDescriptionKey)}
        </p>
      </SectionCard>

      <p className="border-t border-[var(--border)] pt-5 text-center text-xs text-[var(--muted)]">
        © {applicationIdentity.copyrightYear}{" "}
        {applicationIdentity.copyrightOwner}. {t("about.rightsReserved")}
      </p>
    </div>
  );
}
