import type {
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
} from "@/lib/data/types";
import type { RoomStatus } from "@/lib/data/types";

export type MaintenanceStatusFilter = "all" | MaintenanceStatus;
export type MaintenancePriorityFilter = "all" | MaintenancePriority;
export type MaintenanceCategoryFilter = "all" | MaintenanceCategory;

export type MaintenanceListRecord = {
  id: string;
  reference: string;
  reportedDate: string;
  category: MaintenanceCategory;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  vendor: string | null;
  room: {
    id: string;
    roomNumber: string;
    location: string;
    floor: number | null;
    status: RoomStatus;
  } | null;
};

export function filterMaintenanceRecords(
  records: readonly MaintenanceListRecord[],
  query: string,
  status: MaintenanceStatusFilter,
  priority: MaintenancePriorityFilter,
  category: MaintenanceCategoryFilter,
): readonly MaintenanceListRecord[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("en");

  return records.filter((record) => {
    const matchesStatus = status === "all" || record.status === status;
    const matchesPriority =
      priority === "all" || record.priority === priority;
    const matchesCategory =
      category === "all" || record.category === category;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      record.reference.toLocaleLowerCase("en").includes(normalizedQuery) ||
      record.title.toLocaleLowerCase("en").includes(normalizedQuery) ||
      record.description.toLocaleLowerCase("en").includes(normalizedQuery) ||
      record.vendor?.toLocaleLowerCase("en").includes(normalizedQuery) ===
        true ||
      record.room?.roomNumber
        .toLocaleLowerCase("en")
        .includes(normalizedQuery) === true;

    return (
      matchesStatus &&
      matchesPriority &&
      matchesCategory &&
      matchesQuery
    );
  });
}
