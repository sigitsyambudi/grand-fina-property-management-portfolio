import type { Metadata } from "next";
import type {
  LeaseListRecord,
  LeaseStatusFilter,
} from "@/components/leases/lease-filter";
import { LeasesManagement } from "@/components/leases/leases-management";
import { deriveOccupancy } from "@/lib/data/derived";
import type { Lease, Room, Tenant } from "@/lib/data/types";
import { getWorkspaceData } from "@/lib/data/workspace-read";
import { getPropertyAccess, hasRole } from "@/lib/auth/access";

export const metadata: Metadata = {
  title: "Leases",
  description: "Fictional Emerald Haven Residence lease periods, rates, and billing days.",
};

const allowedStatuses: readonly LeaseStatusFilter[] = [
  "all",
  "active",
  "upcoming",
  "ended",
];

function isLeaseStatusFilter(value: unknown): value is LeaseStatusFilter {
  return (
    typeof value === "string" &&
    allowedStatuses.some((status) => status === value)
  );
}

function parseStatus(
  value: string | string[] | undefined,
): LeaseStatusFilter {
  const status = Array.isArray(value) ? value[0] : value;
  return isLeaseStatusFilter(status) ? status : "all";
}

function createLeaseListRecord(
  lease: Lease,
  tenantById: ReadonlyMap<string, Tenant>,
  roomById: ReadonlyMap<string, Room>,
): LeaseListRecord {
  const tenant = tenantById.get(lease.tenantId);
  const room = roomById.get(lease.roomId);

  if (!tenant || !room) {
    throw new Error(`Invalid canonical references for lease ${lease.id}.`);
  }

  return {
    id: lease.id,
    reference: lease.reference,
    status: lease.status,
    monthlyRent: lease.monthlyRent,
    startDate: lease.startDate,
    billingDay: lease.billingDay,
    tenant: {
      id: tenant.id,
      fullName: tenant.fullName,
    },
    room: {
      id: room.id,
      roomNumber: room.roomNumber,
      location: room.location,
    },
  };
}

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const parameters = await searchParams;
  const [data, access] = await Promise.all([
    getWorkspaceData(),
    getPropertyAccess(),
  ]);

  if (!data) {
    return null;
  }

  const activeTenantIds = new Set(
    data.leases
      .filter((lease) => lease.status === "active")
      .map((lease) => lease.tenantId),
  );
  const tenantById = new Map(
    data.tenants.map((tenant) => [tenant.id, tenant]),
  );
  const roomById = new Map(data.rooms.map((room) => [room.id, room]));
  const records = data.leases.map((lease) =>
    createLeaseListRecord(lease, tenantById, roomById),
  );
  return (
    <LeasesManagement
      records={records}
      availableRoomCount={deriveOccupancy(data).available}
      initialStatus={parseStatus(parameters.status)}
      canManage={
        access.status === "authorized" &&
        hasRole(access, ["owner", "admin"])
      }
      eligibleTenants={data.tenants
        .filter(
          (tenant) =>
            tenant.tenantStatus !== "active" &&
            !activeTenantIds.has(tenant.id),
        )
        .map((tenant) => ({
          id: tenant.id,
          fullName: tenant.fullName,
        }))}
      eligibleRooms={data.rooms
        .filter((room) => room.status === "Available")
        .map((room) => ({
          id: room.id,
          roomNumber: room.roomNumber,
          location: room.location,
          monthlyRate: room.monthlyRate,
        }))}
    />
  );
}
