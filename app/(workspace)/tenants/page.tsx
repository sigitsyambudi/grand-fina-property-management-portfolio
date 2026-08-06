import type { Metadata } from "next";
import type {
  TenantListRecord,
  TenantStatusFilter,
} from "@/components/tenants/tenant-filter";
import { TenantsManagement } from "@/components/tenants/tenants-management";
import { deriveOccupancy } from "@/lib/data/derived";
import type { Room, Tenant } from "@/lib/data/types";
import { getWorkspaceData } from "@/lib/data/workspace-read";
import { getPropertyAccess, hasRole } from "@/lib/auth/access";

export const metadata: Metadata = {
  title: "Tenants",
  description: "Fictional Emerald Haven Residence tenant directory and room assignments.",
};

const allowedStatuses: readonly TenantStatusFilter[] = [
  "all",
  "active",
  "former",
  "pending",
];

function isTenantStatusFilter(value: unknown): value is TenantStatusFilter {
  return (
    typeof value === "string" &&
    allowedStatuses.some((status) => status === value)
  );
}

function parseStatus(
  value: string | string[] | undefined,
): TenantStatusFilter {
  const status = Array.isArray(value) ? value[0] : value;
  return isTenantStatusFilter(status) ? status : "all";
}

function createTenantListRecord(
  tenant: Tenant,
  roomById: ReadonlyMap<string, Room>,
): TenantListRecord {
  const room = roomById.get(tenant.currentRoomId);

  if (tenant.tenantStatus === "active" && !room) {
    throw new Error(`Missing canonical room for tenant record ${tenant.id}.`);
  }

  return {
    id: tenant.id,
    fullName: tenant.fullName,
    preferredName: tenant.preferredName,
    phone: tenant.phone,
    email: tenant.email,
    occupation: tenant.occupation,
    companyOrInstitution: tenant.companyOrInstitution,
    tenantStatus: tenant.tenantStatus,
    room: room
      ? {
          id: room.id,
          roomNumber: room.roomNumber,
          location: room.location,
          floor: room.floor,
        }
      : null,
  };
}

export default async function TenantsPage({
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

  const roomById = new Map(data.rooms.map((room) => [room.id, room]));
  const records = data.tenants.map((tenant) =>
    createTenantListRecord(tenant, roomById),
  );
  return (
    <TenantsManagement
      records={records}
      availableRoomCount={deriveOccupancy(data).available}
      initialStatus={parseStatus(parameters.status)}
      canManage={
        access.status === "authorized" &&
        hasRole(access, ["owner", "admin"])
      }
    />
  );
}
