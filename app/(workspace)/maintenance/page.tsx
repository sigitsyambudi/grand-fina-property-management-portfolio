import type { Metadata } from "next";
import type {
  MaintenanceCategoryFilter,
  MaintenanceListRecord,
  MaintenancePriorityFilter,
  MaintenanceStatusFilter,
} from "@/components/maintenance/maintenance-filter";
import { MaintenanceManagement } from "@/components/maintenance/maintenance-management";
import { getPropertyAccess, hasRole } from "@/lib/auth/access";
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  type MaintenanceRecord,
  type Room,
} from "@/lib/data/types";
import { deriveMaintenanceSummary } from "@/lib/data/derived";
import { getWorkspaceData } from "@/lib/data/workspace-read";

export const metadata: Metadata = {
  title: "Maintenance",
  description: "Fictional Emerald Haven Residence maintenance records and work status.",
};

function parseFilter<T extends string>(
  value: string | string[] | undefined,
  allowedValues: readonly T[],
  fallback: T,
): T {
  const candidate = Array.isArray(value) ? value[0] : value;
  return allowedValues.find((allowed) => allowed === candidate) ?? fallback;
}

function createMaintenanceListRecord(
  record: MaintenanceRecord,
  roomById: ReadonlyMap<string, Room>,
): MaintenanceListRecord {
  const room = record.roomId ? roomById.get(record.roomId) : null;

  if (record.roomId && !room) {
    throw new Error(`Missing canonical room for maintenance ${record.id}.`);
  }

  return {
    id: record.id,
    reference: record.reference,
    reportedDate: record.reportedDate,
    category: record.category,
    title: record.title,
    description: record.description,
    priority: record.priority,
    status: record.status,
    vendor: record.vendor,
    room: room
      ? {
          id: room.id,
          roomNumber: room.roomNumber,
          location: room.location,
          floor: room.floor,
          status: room.status,
        }
      : null,
  };
}

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string | string[];
    priority?: string | string[];
    category?: string | string[];
  }>;
}) {
  const parameters = await searchParams;
  const [data, access] = await Promise.all([
    getWorkspaceData(),
    getPropertyAccess(),
  ]);

  if (!data) {
    return null;
  }

  const roomById = new Map(data.rooms.map((room) => [room.id, room]));
  const records = data.maintenanceRecords.map((record) =>
    createMaintenanceListRecord(record, roomById),
  );
  const allowedStatuses: readonly MaintenanceStatusFilter[] = [
    "all",
    ...MAINTENANCE_STATUSES,
  ];
  const allowedPriorities: readonly MaintenancePriorityFilter[] = [
    "all",
    ...MAINTENANCE_PRIORITIES,
  ];
  const allowedCategories: readonly MaintenanceCategoryFilter[] = [
    "all",
    ...MAINTENANCE_CATEGORIES,
  ];

  return (
    <MaintenanceManagement
      records={records}
      summary={deriveMaintenanceSummary(data)}
      initialStatus={parseFilter(
        parameters.status,
        allowedStatuses,
        "all",
      )}
      initialPriority={parseFilter(
        parameters.priority,
        allowedPriorities,
        "all",
      )}
      initialCategory={parseFilter(
        parameters.category,
        allowedCategories,
        "all",
      )}
      canManage={
        access.status === "authorized" &&
        hasRole(access, ["owner", "admin"])
      }
      rooms={data.rooms.map((room) => ({
        id: room.id,
        roomNumber: room.roomNumber,
      }))}
      defaultReportedDate={new Date().toISOString().slice(0, 10)}
    />
  );
}
