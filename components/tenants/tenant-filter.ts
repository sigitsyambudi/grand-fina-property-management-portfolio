import type { RoomLocation, TenantStatus } from "@/lib/data/types";

export type TenantStatusFilter = "all" | TenantStatus;

export type TenantListRecord = {
  id: string;
  fullName: string;
  preferredName: string | null;
  phone: string;
  email: string | null;
  occupation: string | null;
  companyOrInstitution: string | null;
  tenantStatus: TenantStatus;
  room: {
    id: string;
    roomNumber: string;
    location: RoomLocation;
    floor: 1 | 2 | null;
  } | null;
};

export function filterTenantRecords(
  records: readonly TenantListRecord[],
  query: string,
  status: TenantStatusFilter,
): readonly TenantListRecord[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("en");

  return records.filter((tenant) => {
    const matchesStatus =
      status === "all" || tenant.tenantStatus === status;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      tenant.fullName.toLocaleLowerCase("en").includes(normalizedQuery) ||
      tenant.preferredName
        ?.toLocaleLowerCase("en")
        .includes(normalizedQuery) === true ||
      tenant.phone.toLocaleLowerCase("en").includes(normalizedQuery) ||
      tenant.email?.toLocaleLowerCase("en").includes(normalizedQuery) === true ||
      tenant.room?.roomNumber
        .toLocaleLowerCase("en")
        .includes(normalizedQuery) === true;

    return matchesStatus && matchesQuery;
  });
}
