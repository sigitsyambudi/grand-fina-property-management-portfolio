import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LocalizedText } from "@/components/localization/localized-text";
import { LocalizedDisplay } from "@/components/localization/localized-display";
import { LocalizedSection } from "@/components/localization/localized-section";
import { formatIdr } from "@/components/rooms/room-formatters";
import { RoomStatusBadge } from "@/components/rooms/room-status-badge";
import { RoomEditPanel } from "@/components/rooms/room-edit-panel";
import { SectionCard } from "@/components/ui/section-card";
import { getPropertyAccess, hasRole } from "@/lib/auth/access";
import { getWorkspaceData } from "@/lib/data/workspace-read";

type RoomDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: RoomDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getWorkspaceData();
  const room = data?.rooms.find((candidate) => candidate.id === id);

  return {
    title: room ? `Room ${room.roomNumber}` : "Room not found",
    description: room
      ? `Fictional Emerald Haven Residence room ${room.roomNumber}.`
      : "The requested demo room could not be found.",
  };
}

export default async function RoomDetailPage({
  params,
}: RoomDetailPageProps) {
  const { id } = await params;
  const [data, access] = await Promise.all([
    getWorkspaceData(),
    getPropertyAccess(),
  ]);

  if (!data) {
    return null;
  }

  const room = data.rooms.find((candidate) => candidate.id === id);

  if (!room) {
    notFound();
  }

  const canEdit =
    access.status === "authorized" &&
    hasRole(access, ["owner", "admin"]);

  return (
    <div className="space-y-6">
      <Link
        href="/rooms"
        className="inline-flex min-h-10 items-center text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4 hover:decoration-[var(--brand)]"
      >
        ← <LocalizedText translationKey="rooms.back" />
      </Link>

      <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-[28px]">
              <LocalizedText
                translationKey="common.roomNumber"
                values={{ number: room.roomNumber }}
              />
            </h1>
            <RoomStatusBadge status={room.status} />
            <span className="rounded bg-[#edf0ee] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#59645f]">
              <LocalizedText translationKey="common.demoData" />
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            <LocalizedDisplay kind="display-value" value={room.location} />
            {room.floor ? (
              <> · <LocalizedText translationKey="common.floorNumber" values={{ floor: room.floor }} /></>
            ) : null}
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">
          <LocalizedText translationKey="rooms.statusReadOnly" />
        </p>
      </div>

      <RoomEditPanel room={room} canEdit={canEdit} />

      <LocalizedSection
        ariaLabelKey="rooms.summaryAria"
        className="grid grid-cols-2 border border-[var(--border)] bg-white lg:grid-cols-4"
      >
        <div className="border-b border-r border-[var(--border)] p-4 lg:border-b-0 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="common.location" />
          </p>
          <p className="mt-2 text-sm font-semibold"><LocalizedDisplay kind="display-value" value={room.location} /></p>
        </div>
        <div className="border-b border-[var(--border)] p-4 lg:border-b-0 lg:border-r sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="common.floor" />
          </p>
          <p className="mt-2 text-sm font-semibold">
            {room.floor ? (
              <LocalizedText translationKey="common.floorNumber" values={{ floor: room.floor }} />
            ) : (
              <LocalizedText translationKey="rooms.notConfigured" />
            )}
          </p>
        </div>
        <div className="border-r border-[var(--border)] p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="common.monthlyRate" />
          </p>
          <p className="mt-2 text-sm font-semibold tabular-nums">
            {formatIdr(room.monthlyRate)}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="common.currentStatus" />
          </p>
          <div className="mt-2">
            <RoomStatusBadge status={room.status} />
          </div>
        </div>
      </LocalizedSection>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <div className="space-y-6">
          <SectionCard
            title={<LocalizedText translationKey="rooms.currentOccupancy" />}
            description={<LocalizedText translationKey="rooms.currentOccupancyDescription" />}
          >
            {room.status === "Occupied" ? (
              <dl className="grid gap-5 p-5 sm:grid-cols-3 sm:p-6">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                    <LocalizedText translationKey="rooms.currentTenant" />
                  </dt>
                  <dd className="mt-2 text-sm font-semibold">
                    {room.tenantName}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                    <LocalizedText translationKey="rooms.occupancyStarted" />
                  </dt>
                  <dd className="mt-2 text-sm font-medium">
                    {room.occupancyStartDate
                      ? <LocalizedDisplay kind="date" value={room.occupancyStartDate} />
                      : <LocalizedText translationKey="rooms.notConfigured" />}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                    <LocalizedText translationKey="rooms.nextRentDue" />
                  </dt>
                  <dd className="mt-2 text-sm font-medium">
                    {room.nextDueDate
                      ? <LocalizedDisplay kind="date" value={room.nextDueDate} />
                      : <LocalizedText translationKey="rooms.notConfigured" />}
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="p-5 sm:p-6">
                <p className="text-sm font-medium">
                  {room.status === "Available"
                    ? <LocalizedText translationKey="rooms.vacantSentence" />
                    : <LocalizedText translationKey="rooms.maintenanceUnavailable" />}
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  <LocalizedText translationKey="rooms.futureTenancyAssignment" />
                </p>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title={<LocalizedText translationKey="rooms.operationalNotes" />}
            description={<LocalizedText translationKey="rooms.currentInformationDescription" />}
          >
            <div className="p-5 sm:p-6">
              <p className="text-sm leading-6 text-[var(--foreground)]">
                <LocalizedDisplay kind="record-text" value={room.operationalNote} />
              </p>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title={<LocalizedText translationKey="rooms.basicInformation" />}
          >
            <dl className="divide-y divide-[var(--border)]">
              <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <dt className="text-xs text-[var(--muted)]">
                  <LocalizedText translationKey="rooms.roomNumberLabel" />
                </dt>
                <dd className="text-xs font-semibold">{room.roomNumber}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <dt className="text-xs text-[var(--muted)]">
                  <LocalizedText translationKey="common.location" />
                </dt>
                <dd className="text-right text-xs font-semibold">
                  <LocalizedDisplay kind="display-value" value={room.location} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <dt className="text-xs text-[var(--muted)]">
                  <LocalizedText translationKey="common.floor" />
                </dt>
                <dd className="text-xs font-semibold">
                  {room.floor ? (
                    <LocalizedText translationKey="common.floorNumber" values={{ floor: room.floor }} />
                  ) : (
                    <LocalizedText translationKey="rooms.notConfigured" />
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <dt className="text-xs text-[var(--muted)]">
                  <LocalizedText translationKey="rooms.demoReference" />
                </dt>
                <dd className="text-xs font-semibold">{room.id}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title={<LocalizedText translationKey="navigation.maintenance" />}
            description={<LocalizedText translationKey="rooms.maintenanceDescription" />}
          >
            <div className="p-5 sm:p-6">
              <p className="text-sm font-semibold">
                {room.status === "Maintenance"
                  ? <LocalizedText translationKey="rooms.maintenanceActive" />
                  : <LocalizedText translationKey="rooms.noActiveMaintenance" />}
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                {room.maintenanceNote ? <LocalizedDisplay kind="record-text" value={room.maintenanceNote} /> : <LocalizedText translationKey="rooms.noMaintenanceNotes" />}
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
