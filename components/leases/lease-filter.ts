import type { LeaseStatus, RoomLocation } from "@/lib/data/types";

export type LeaseStatusFilter = "all" | LeaseStatus;

export type LeaseListRecord = {
  id: string;
  reference: string;
  status: LeaseStatus;
  monthlyRent: number;
  startDate: string;
  billingDay: number;
  tenant: {
    id: string;
    fullName: string;
  };
  room: {
    id: string;
    roomNumber: string;
    location: RoomLocation;
  };
};

export function filterLeaseRecords(
  records: readonly LeaseListRecord[],
  query: string,
  status: LeaseStatusFilter,
): readonly LeaseListRecord[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("en");

  return records.filter((lease) => {
    const matchesStatus = status === "all" || lease.status === status;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      lease.tenant.fullName
        .toLocaleLowerCase("en")
        .includes(normalizedQuery) ||
      lease.room.roomNumber
        .toLocaleLowerCase("en")
        .includes(normalizedQuery) ||
      lease.reference.toLocaleLowerCase("en").includes(normalizedQuery);

    return matchesStatus && matchesQuery;
  });
}
