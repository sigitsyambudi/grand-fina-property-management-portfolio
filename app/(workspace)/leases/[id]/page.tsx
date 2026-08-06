import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LocalizedText } from "@/components/localization/localized-text";
import { LocalizedDisplay } from "@/components/localization/localized-display";
import { LocalizedSection } from "@/components/localization/localized-section";
import { LeaseEditPanel } from "@/components/leases/lease-write-panels";
import { LeaseStatusBadge } from "@/components/leases/lease-status-badge";
import { formatIdr } from "@/components/rooms/room-formatters";
import { SectionCard } from "@/components/ui/section-card";
import { getPropertyAccess, hasRole } from "@/lib/auth/access";
import { getWorkspaceData } from "@/lib/data/workspace-read";

type LeaseDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: LeaseDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getWorkspaceData();
  const lease = data?.leases.find((candidate) => candidate.id === id);

  return {
    title: lease ? lease.reference : "Lease not found",
    description: lease
      ? `Fictional Emerald Haven Residence lease terms for ${lease.reference}.`
      : "The requested fictional lease record could not be found.",
  };
}

export default async function LeaseDetailPage({
  params,
}: LeaseDetailPageProps) {
  const { id } = await params;
  const [data, access] = await Promise.all([
    getWorkspaceData(),
    getPropertyAccess(),
  ]);

  if (!data) {
    return null;
  }

  const lease = data.leases.find((candidate) => candidate.id === id);

  if (!lease) {
    notFound();
  }

  const tenant = data.tenants.find(
    (candidate) => candidate.id === lease.tenantId,
  );
  const room = data.rooms.find(
    (candidate) => candidate.id === lease.roomId,
  );

  if (!tenant || !room) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/leases"
        className="inline-flex min-h-10 items-center text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4 hover:decoration-[var(--brand)]"
      >
        ← <LocalizedText translationKey="common.backToLeases" />
      </Link>

      <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-[28px]">
              {lease.reference}
            </h1>
            <LeaseStatusBadge status={lease.status} />
            <span className="rounded bg-[#edf0ee] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#59645f]">
              <LocalizedText translationKey="common.demoData" />
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {tenant.fullName} · <LocalizedText translationKey="common.roomNumber" values={{ number: room.roomNumber }} />
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">
          <LocalizedText translationKey="leases.identifiersImmutable" />
        </p>
      </div>

      <LeaseEditPanel
        lease={lease}
        canManage={
          lease.status === "active" &&
          access.status === "authorized" &&
          hasRole(access, ["owner", "admin"])
        }
      />

      <LocalizedSection
        ariaLabelKey="leases.summaryAria"
        className="grid grid-cols-2 border border-[var(--border)] bg-white lg:grid-cols-4"
      >
        <div className="border-b border-r border-[var(--border)] p-4 lg:border-b-0 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="common.tenant" />
          </p>
          <p className="mt-2 text-sm font-semibold">{tenant.fullName}</p>
        </div>
        <div className="border-b border-[var(--border)] p-4 lg:border-b-0 lg:border-r sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="common.room" />
          </p>
          <p className="mt-2 text-sm font-semibold"><LocalizedText translationKey="common.roomNumber" values={{ number: room.roomNumber }} /></p>
        </div>
        <div className="border-r border-[var(--border)] p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="common.monthlyRent" />
          </p>
          <p className="mt-2 text-sm font-semibold tabular-nums">
            {formatIdr(lease.monthlyRent)}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="leases.billingDay" />
          </p>
          <p className="mt-2 text-sm font-semibold">
            <LocalizedText translationKey="common.monthlyBillingDay" values={{ day: lease.billingDay }} />
          </p>
        </div>
      </LocalizedSection>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <div className="space-y-6">
          <SectionCard
            title={<LocalizedText translationKey="leases.relationship" />}
            description={<LocalizedText translationKey="leases.relationshipDescription" />}
          >
            <dl className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="common.tenant" />
                </dt>
                <dd className="mt-2 text-sm font-semibold">
                  {tenant.fullName}
                </dd>
                <Link
                  href={`/tenants/${tenant.id}`}
                  className="mt-3 inline-flex min-h-9 items-center text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4 hover:decoration-[var(--brand)]"
                >
                  <LocalizedText translationKey="common.viewTenantDetails" />
                </Link>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="common.room" />
                </dt>
                <dd className="mt-2 text-sm font-semibold">
                  <LocalizedText translationKey="common.roomNumber" values={{ number: room.roomNumber }} />
                </dd>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  <LocalizedDisplay kind="display-value" value={room.location} />
                  {room.floor ? (
                    <> · <LocalizedText translationKey="common.floorNumber" values={{ floor: room.floor }} /></>
                  ) : null}
                </p>
                <Link
                  href={`/rooms/${room.id}`}
                  className="mt-3 inline-flex min-h-9 items-center text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4 hover:decoration-[var(--brand)]"
                >
                  <LocalizedText translationKey="common.viewRoomDetails" />
                </Link>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title={<LocalizedText translationKey="leases.terms" />}
            description={<LocalizedText translationKey="leases.termsDescription" />}
          >
            <dl className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="leases.startDate" />
                </dt>
                <dd className="mt-2 text-sm font-semibold">
                  <LocalizedDisplay kind="date" value={lease.startDate} />
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="leases.endDate" />
                </dt>
                <dd className="mt-2 text-sm font-semibold">
                  <LocalizedDisplay kind="date" value={lease.endDate} />
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="leases.billingDay" />
                </dt>
                <dd className="mt-2 text-sm font-semibold">
                  <LocalizedText translationKey="common.monthlyBillingDay" values={{ day: lease.billingDay }} />
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="leases.deposit" />
                </dt>
                <dd className="mt-2 text-sm font-semibold">
                  {lease.depositAmount === null
                    ? <LocalizedText translationKey="rooms.notConfigured" />
                    : formatIdr(lease.depositAmount)}
                </dd>
              </div>
            </dl>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title={<LocalizedText translationKey="leases.rentalRate" />}
            description={<LocalizedText translationKey="leases.rentalRateDescription" />}
          >
            <div className="p-5 sm:p-6">
              <p className="text-xl font-semibold tabular-nums">
                {formatIdr(lease.monthlyRent)}
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                <LocalizedText translationKey="leases.rateMatchesRoom" values={{ room: room.roomNumber }} />
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title={<LocalizedText translationKey="settings.dataClassification" />}
            description={<LocalizedText translationKey="leases.classificationDescription" />}
          >
            <dl className="divide-y divide-[var(--border)]">
              <div className="px-5 py-4 sm:px-6">
                <dt className="text-xs font-semibold text-[var(--foreground)]">
                  <LocalizedText translationKey="leases.currentPropertyConfiguration" />
                </dt>
                <dd className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  <LocalizedText translationKey="leases.currentPropertyConfigurationDescription" />
                </dd>
              </div>
              <div className="px-5 py-4 sm:px-6">
                <dt className="text-xs font-semibold text-[var(--foreground)]">
                  <LocalizedText translationKey="leases.fictionalFields" />
                </dt>
                <dd className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  <LocalizedText translationKey="leases.fictionalFieldsDescription" />
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title={<LocalizedText translationKey="common.notes" />}
            description={<LocalizedText translationKey="leases.notesDescription" />}
          >
            <div className="p-5 sm:p-6">
              <p className="text-sm leading-6 text-[var(--foreground)]">
                <LocalizedDisplay kind="record-text" value={lease.notes} />
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
