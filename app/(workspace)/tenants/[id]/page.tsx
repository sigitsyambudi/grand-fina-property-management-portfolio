import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LocalizedText } from "@/components/localization/localized-text";
import { LocalizedDisplay } from "@/components/localization/localized-display";
import { LocalizedSection } from "@/components/localization/localized-section";
import { TenantStatusBadge } from "@/components/tenants/tenant-status-badge";
import { TenantEditPanel } from "@/components/tenants/tenant-write-panels";
import { SectionCard } from "@/components/ui/section-card";
import { getPropertyAccess, hasRole } from "@/lib/auth/access";
import { getWorkspaceData } from "@/lib/data/workspace-read";

type TenantDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: TenantDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getWorkspaceData();
  const tenant = data?.tenants.find((candidate) => candidate.id === id);

  return {
    title: tenant ? tenant.fullName : "Tenant not found",
    description: tenant
      ? "Fictional Emerald Haven Residence tenant and lease relationship."
      : "The requested tenant record could not be found.",
  };
}

export default async function TenantDetailPage({
  params,
}: TenantDetailPageProps) {
  const { id } = await params;
  const [data, access] = await Promise.all([
    getWorkspaceData(),
    getPropertyAccess(),
  ]);

  if (!data) {
    return null;
  }

  const tenant = data.tenants.find((candidate) => candidate.id === id);
  if (!tenant) {
    notFound();
  }

  const activeLease = data.leases.find(
    (lease) => lease.tenantId === tenant.id && lease.status === "active",
  );
  const room = activeLease
    ? data.rooms.find((candidate) => candidate.id === activeLease.roomId)
    : null;

  if (activeLease && !room) {
    notFound();
  }

  const canManage =
    access.status === "authorized" &&
    hasRole(access, ["owner", "admin"]);

  return (
    <div className="space-y-6">
      <Link
        href="/tenants"
        className="inline-flex min-h-10 items-center text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4 hover:decoration-[var(--brand)]"
      >
        ← <LocalizedText translationKey="tenants.back" />
      </Link>

      <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-[28px]">
              {tenant.fullName}
            </h1>
            <TenantStatusBadge status={tenant.tenantStatus} />
            <span className="rounded bg-[#edf0ee] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#59645f]">
              <LocalizedText translationKey="tenants.sensitiveRecord" />
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {tenant.preferredName ? (
              <LocalizedText
                translationKey="tenants.preferred"
                values={{ name: tenant.preferredName }}
              />
            ) : (
              <LocalizedText translationKey="tenants.noPreferredName" />
            )}
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">
          <LocalizedText translationKey="tenants.statusReadOnly" />
        </p>
      </div>

      <TenantEditPanel tenant={tenant} canManage={canManage} />

      <LocalizedSection
        ariaLabelKey="tenants.title"
        className="grid grid-cols-2 border border-[var(--border)] bg-white lg:grid-cols-4"
      >
        <div className="border-b border-r border-[var(--border)] p-4 sm:p-5 lg:border-b-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="tenants.currentRoom" />
          </p>
          <p className="mt-2 text-sm font-semibold">
            {room ? (
              <LocalizedText
                translationKey="common.roomNumber"
                values={{ number: room.roomNumber }}
              />
            ) : (
              <LocalizedText translationKey="tenants.noActiveLease" />
            )}
          </p>
        </div>
        <div className="border-b border-[var(--border)] p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="common.location" />
          </p>
          <p className="mt-2 text-sm font-semibold">
            {room ? <LocalizedDisplay kind="display-value" value={room.location} /> : <LocalizedText translationKey="tenants.notApplicable" />}
          </p>
        </div>
        <div className="border-r border-[var(--border)] p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="tenants.phone" />
          </p>
          <p className="mt-2 text-sm font-semibold">
            {tenant.phone || (
              <LocalizedText translationKey="tenants.notProvided" />
            )}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="common.status" />
          </p>
          <div className="mt-2">
            <TenantStatusBadge status={tenant.tenantStatus} />
          </div>
        </div>
      </LocalizedSection>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <div className="space-y-6">
          <SectionCard
            title={<LocalizedText translationKey="tenants.identity" />}
            description={
              <LocalizedText translationKey="tenants.identityDescription" />
            }
          >
            <dl className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="tenants.fullName" />
                </dt>
                <dd className="mt-2 text-sm font-semibold">{tenant.fullName}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="tenants.preferredName" />
                </dt>
                <dd className="mt-2 text-sm font-medium">
                  {tenant.preferredName ?? (
                    <LocalizedText translationKey="tenants.notProvided" />
                  )}
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title={<LocalizedText translationKey="tenants.contact" />}
            description={
              <LocalizedText translationKey="tenants.contactDescription" />
            }
          >
            <dl className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="tenants.phone" />
                </dt>
                <dd className="mt-2 text-sm font-semibold">
                  {tenant.phone || (
                    <LocalizedText translationKey="tenants.notProvided" />
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="tenants.email" />
                </dt>
                <dd className="mt-2 break-all text-sm font-medium">
                  {tenant.email ?? (
                    <LocalizedText translationKey="tenants.notProvided" />
                  )}
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title={<LocalizedText translationKey="tenants.emergencyContact" />}
            description={
              <LocalizedText
                translationKey="tenants.emergencyContactDescription"
              />
            }
          >
            <dl className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText
                    translationKey="tenants.emergencyContactName"
                  />
                </dt>
                <dd className="mt-2 text-sm font-semibold">
                  {tenant.emergencyContactName || (
                    <LocalizedText translationKey="tenants.notProvided" />
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText
                    translationKey="tenants.emergencyContactPhone"
                  />
                </dt>
                <dd className="mt-2 text-sm font-medium">
                  {tenant.emergencyContactPhone || (
                    <LocalizedText translationKey="tenants.notProvided" />
                  )}
                </dd>
              </div>
            </dl>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title={<LocalizedText translationKey="tenants.currentTenancy" />}
            description={
              <LocalizedText translationKey="tenants.relationshipDescription" />
            }
          >
            <div className="p-5 sm:p-6">
              {room && activeLease ? (
                <>
                  <p className="text-lg font-semibold">
                    <LocalizedText
                      translationKey="common.roomNumber"
                      values={{ number: room.roomNumber }}
                    />
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    <LocalizedDisplay kind="display-value" value={room.location} />
                    {room.floor ? (
                      <>
                        {" · "}
                        <LocalizedText
                          translationKey="common.floorNumber"
                          values={{ floor: room.floor }}
                        />
                      </>
                    ) : null}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-[var(--brand)]">
                    <LocalizedText translationKey="tenants.activeLease" />
                  </p>
                  <Link
                    href={`/rooms/${room.id}`}
                    className="mt-5 inline-flex min-h-10 items-center border border-[var(--border)] px-4 text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand-soft)]"
                  >
                    <LocalizedText translationKey="tenants.viewRoom" />
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold">
                    <LocalizedText translationKey="tenants.noActiveLease" />
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                    <LocalizedText
                      translationKey="tenants.noActiveLeaseDescription"
                    />
                  </p>
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title={<LocalizedText translationKey="tenants.workInstitution" />}
          >
            <dl className="divide-y divide-[var(--border)]">
              <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <dt className="text-xs text-[var(--muted)]">
                  <LocalizedText translationKey="tenants.occupation" />
                </dt>
                <dd className="text-right text-xs font-semibold">
                  {tenant.occupation ?? (
                    <LocalizedText translationKey="tenants.notProvided" />
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <dt className="text-xs text-[var(--muted)]">
                  <LocalizedText translationKey="tenants.company" />
                </dt>
                <dd className="text-right text-xs font-semibold">
                  {tenant.companyOrInstitution ?? (
                    <LocalizedText translationKey="tenants.notProvided" />
                  )}
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title={<LocalizedText translationKey="common.notes" />}
            description={
              <LocalizedText translationKey="tenants.notesDescription" />
            }
          >
            <div className="p-5 sm:p-6">
              <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
                {tenant.notes || (
                  <LocalizedText translationKey="tenants.notProvided" />
                )}
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
