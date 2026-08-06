import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LocalizedText } from "@/components/localization/localized-text";
import { LocalizedDisplay } from "@/components/localization/localized-display";
import { LocalizedSection } from "@/components/localization/localized-section";
import { MaintenanceCategoryBadge } from "@/components/maintenance/maintenance-category-badge";
import { MaintenancePriorityBadge } from "@/components/maintenance/maintenance-priority-badge";
import { MaintenanceStatusBadge } from "@/components/maintenance/maintenance-status-badge";
import { MaintenanceEditPanel } from "@/components/maintenance/maintenance-write-panels";
import { formatIdr } from "@/components/rooms/room-formatters";
import { RoomStatusBadge } from "@/components/rooms/room-status-badge";
import { SectionCard } from "@/components/ui/section-card";
import { getPropertyAccess, hasRole } from "@/lib/auth/access";
import { getWorkspaceData } from "@/lib/data/workspace-read";

type MaintenanceDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: MaintenanceDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getWorkspaceData();
  const record = data?.maintenanceRecords.find(
    (candidate) => candidate.reference === id || candidate.id === id,
  );
  const isDemoRecord = record?.reference.includes("-DEMO-") ?? false;

  return {
    title: record ? record.reference : "Maintenance record not found",
    description: record
      ? `${
          isDemoRecord ? "Fictional demo" : "Persisted"
        } fictional Emerald Haven Residence maintenance record: ${record.reference}.`
      : "The requested maintenance record could not be found.",
  };
}

export default async function MaintenanceDetailPage({
  params,
}: MaintenanceDetailPageProps) {
  const { id } = await params;
  const [data, access] = await Promise.all([
    getWorkspaceData(),
    getPropertyAccess(),
  ]);

  if (!data) {
    return null;
  }

  const record = data.maintenanceRecords.find(
    (candidate) => candidate.reference === id || candidate.id === id,
  );

  if (!record) {
    notFound();
  }

  const room = record.roomId
    ? data.rooms.find((candidate) => candidate.id === record.roomId)
    : null;

  if (record.roomId && !room) {
    notFound();
  }

  const hasCostInformation =
    record.estimatedCost !== null || record.actualCost !== null;
  const isDemoRecord = record.reference.includes("-DEMO-");
  const canManage =
    access.status === "authorized" &&
    hasRole(access, ["owner", "admin"]);

  return (
    <div className="space-y-6">
      <Link
        href="/maintenance"
        className="inline-flex min-h-10 items-center text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4 hover:decoration-[var(--brand)]"
      >
        ← <LocalizedText translationKey="maintenance.back" />
      </Link>

      <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-[28px]">
              {record.reference}
            </h1>
            <MaintenanceStatusBadge status={record.status} />
            <MaintenancePriorityBadge priority={record.priority} />
            <span className="rounded bg-[#f6eddd] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#815d22]">
              <LocalizedText
                translationKey={
                  isDemoRecord
                    ? "maintenance.demoBadge"
                    : "maintenance.persistedBadge"
                }
              />
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            <LocalizedDisplay kind="record-text" value={record.title} /> ·{" "}
            {room ? (
              <LocalizedText
                translationKey="common.roomNumber"
                values={{ number: room.roomNumber }}
              />
            ) : (
              <LocalizedText translationKey="common.propertyWide" />
            )}
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">
          <LocalizedText
            translationKey={
              isDemoRecord
                ? "maintenance.demoSeedRecord"
                : "maintenance.operationalRecord"
            }
          />
        </p>
      </div>

      <div>
        <MaintenanceEditPanel
          record={record}
          canManage={canManage}
          rooms={data.rooms.map((candidate) => ({
            id: candidate.id,
            roomNumber: candidate.roomNumber,
          }))}
        />
        {!canManage &&
        record.status !== "completed" &&
        record.status !== "cancelled" ? (
          <p className="text-xs text-[var(--muted)]">
            <LocalizedText translationKey="maintenance.staffReadOnly" />
          </p>
        ) : null}
      </div>

      <LocalizedSection
        ariaLabelKey="navigation.maintenance"
        className="grid grid-cols-2 border border-[var(--border)] bg-white lg:grid-cols-4"
      >
        <div className="border-b border-r border-[var(--border)] p-4 sm:p-5 lg:border-b-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="maintenance.issue" />
          </p>
          <p className="mt-2 text-sm font-semibold"><LocalizedDisplay kind="record-text" value={record.title} /></p>
        </div>
        <div className="border-b border-[var(--border)] p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="common.location" />
          </p>
          <p className="mt-2 text-sm font-semibold">
            {room ? (
              <LocalizedText
                translationKey="common.roomNumber"
                values={{ number: room.roomNumber }}
              />
            ) : (
              <LocalizedText translationKey="common.propertyWide" />
            )}
          </p>
        </div>
        <div className="border-r border-[var(--border)] p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="maintenance.reported" />
          </p>
          <p className="mt-2 text-sm font-semibold">
            <LocalizedDisplay kind="date" value={record.reportedDate} />
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="common.status" />
          </p>
          <div className="mt-2">
            <MaintenanceStatusBadge status={record.status} />
          </div>
        </div>
      </LocalizedSection>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <div className="space-y-6">
          <SectionCard
            title={<LocalizedText translationKey="maintenance.issueDetails" />}
            description={
              <LocalizedText
                translationKey={
                  isDemoRecord
                    ? "maintenance.demoIssueDescription"
                    : "maintenance.operationalIssueDescription"
                }
              />
            }
          >
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <MaintenanceCategoryBadge category={record.category} />
                <MaintenancePriorityBadge priority={record.priority} />
              </div>
              <h2 className="mt-4 text-base font-semibold"><LocalizedDisplay kind="record-text" value={record.title} /></h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                <LocalizedDisplay kind="record-text" value={record.description} />
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title={<LocalizedText translationKey="common.location" />}
            description={
              room
                ? <LocalizedText translationKey="maintenance.roomResolved" />
                : <LocalizedText translationKey="maintenance.propertyWideDescription" />
            }
          >
            <div className="p-5 sm:p-6">
              {room ? (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-semibold">
                      <LocalizedText
                        translationKey="common.roomNumber"
                        values={{ number: room.roomNumber }}
                      />
                    </p>
                    <RoomStatusBadge status={room.status} />
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted)]">
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
                  <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
                    <LocalizedText translationKey="maintenance.roomStatusBoundary" />
                  </p>
                  <Link
                    href={`/rooms/${room.id}`}
                    className="mt-3 inline-flex min-h-9 items-center text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4 hover:decoration-[var(--brand)]"
                  >
                    <LocalizedText translationKey="maintenance.viewRoom" />
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold">
                    <LocalizedText translationKey="common.propertyWide" />
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                    <LocalizedText translationKey="maintenance.noRoomRelationship" />
                  </p>
                </>
              )}
            </div>
          </SectionCard>

          {record.resolution ? (
            <SectionCard
              title={<LocalizedText translationKey="maintenance.resolution" />}
              description={
                <LocalizedText
                  translationKey={
                    isDemoRecord
                      ? "maintenance.demoResolutionDescription"
                      : "maintenance.operationalResolutionDescription"
                  }
                />
              }
            >
              <div className="p-5 sm:p-6">
                <p className="text-sm leading-6"><LocalizedDisplay kind="record-text" value={record.resolution} /></p>
              </div>
            </SectionCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <SectionCard
            title={<LocalizedText translationKey="maintenance.schedule" />}
            description={
              <LocalizedText
                translationKey={
                  isDemoRecord
                    ? "maintenance.demoScheduleDescription"
                    : "maintenance.operationalScheduleDescription"
                }
              />
            }
          >
            <dl className="divide-y divide-[var(--border)]">
              <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <dt className="text-xs text-[var(--muted)]">
                  <LocalizedText translationKey="maintenance.reported" />
                </dt>
                <dd className="text-right text-xs font-semibold">
                  <LocalizedDisplay kind="date" value={record.reportedDate} />
                </dd>
              </div>
              {record.scheduledDate ? (
                <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                  <dt className="text-xs text-[var(--muted)]">
                    <LocalizedText translationKey="maintenance.scheduled" />
                  </dt>
                  <dd className="text-right text-xs font-semibold">
                    <LocalizedDisplay kind="date" value={record.scheduledDate} />
                  </dd>
                </div>
              ) : null}
              {record.completedDate ? (
                <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                  <dt className="text-xs text-[var(--muted)]">
                    <LocalizedText translationKey="maintenance.completed" />
                  </dt>
                  <dd className="text-right text-xs font-semibold">
                    <LocalizedDisplay kind="date" value={record.completedDate} />
                  </dd>
                </div>
              ) : null}
            </dl>
          </SectionCard>

          <SectionCard
            title={<LocalizedText translationKey="maintenance.serviceProvider" />}
            description={
              <LocalizedText
                translationKey={
                  isDemoRecord
                    ? "maintenance.demoProviderDescription"
                    : "maintenance.operationalProviderDescription"
                }
              />
            }
          >
            <div className="p-5 sm:p-6">
              <p className="text-sm font-semibold">
                {record.vendor ? <LocalizedDisplay kind="record-text" value={record.vendor} /> : (
                  <LocalizedText translationKey="maintenance.notAssigned" />
                )}
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                <LocalizedText translationKey="maintenance.providerPrivacy" />
              </p>
            </div>
          </SectionCard>

          {hasCostInformation ? (
            <SectionCard
              title={<LocalizedText translationKey="maintenance.costInformation" />}
              description={
                <LocalizedText translationKey="maintenance.costBoundary" />
              }
            >
              <dl className="divide-y divide-[var(--border)]">
                {record.estimatedCost !== null ? (
                  <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                    <dt className="text-xs text-[var(--muted)]">
                      <LocalizedText translationKey="maintenance.estimatedCost" />
                    </dt>
                    <dd className="text-right text-sm font-semibold tabular-nums">
                      {formatIdr(record.estimatedCost)}
                    </dd>
                  </div>
                ) : null}
                {record.actualCost !== null ? (
                  <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                    <dt className="text-xs text-[var(--muted)]">
                      <LocalizedText translationKey="maintenance.actualCost" />
                    </dt>
                    <dd className="text-right text-sm font-semibold tabular-nums">
                      {formatIdr(record.actualCost)}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <p className="border-t border-[var(--border)] px-5 py-4 text-[10px] leading-4 text-[var(--muted)] sm:px-6">
                <LocalizedText translationKey="maintenance.costBoundaryDetail" />
              </p>
            </SectionCard>
          ) : null}

          {record.notes ? (
            <SectionCard
              title={<LocalizedText translationKey="common.notes" />}
              description={
                <LocalizedText
                  translationKey={
                    isDemoRecord
                      ? "maintenance.demoNoteDescription"
                      : "maintenance.operationalNoteDescription"
                  }
                />
              }
            >
              <div className="p-5 sm:p-6">
                <p className="text-sm leading-6"><LocalizedDisplay kind="record-text" value={record.notes} /></p>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard
            title={<LocalizedText translationKey="settings.dataClassification" />}
            description={
              <LocalizedText
                translationKey={
                  isDemoRecord
                    ? "maintenance.demoClassificationTitle"
                    : "maintenance.persistedClassificationTitle"
                }
              />
            }
          >
            <div className="p-5 sm:p-6">
              <p className="text-xs leading-5 text-[var(--muted)]">
                <LocalizedText
                  translationKey={
                    isDemoRecord
                      ? "maintenance.demoClassification"
                      : "maintenance.persistedClassification"
                  }
                />
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
