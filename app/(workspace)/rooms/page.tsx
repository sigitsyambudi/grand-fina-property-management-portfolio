import type { Metadata } from "next";
import {
  RoomsManagement,
  type RoomStatusFilter,
} from "@/components/rooms/rooms-management";
import { getWorkspaceData } from "@/lib/data/workspace-read";

export const metadata: Metadata = {
  title: "Rooms",
  description: "Fictional Emerald Haven Residence room inventory and occupancy overview.",
};

const allowedStatuses: readonly RoomStatusFilter[] = [
  "All",
  "Occupied",
  "Available",
  "Maintenance",
];

function isRoomStatusFilter(value: unknown): value is RoomStatusFilter {
  return (
    typeof value === "string" &&
    allowedStatuses.some((status) => status === value)
  );
}

function parseStatus(value: string | string[] | undefined): RoomStatusFilter {
  const status = Array.isArray(value) ? value[0] : value;
  return isRoomStatusFilter(status) ? status : "All";
}

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const parameters = await searchParams;
  const data = await getWorkspaceData();

  if (!data) {
    return null;
  }

  return (
    <RoomsManagement
      rooms={data.rooms}
      initialStatus={parseStatus(parameters.status)}
    />
  );
}
