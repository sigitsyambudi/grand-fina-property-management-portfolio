import "server-only";

import { getPropertyAccess, hasRole } from "@/lib/auth/access";
import { createServerActionSupabaseClient } from "@/lib/supabase/server";
import {
  isValidPortfolioRoomConfiguration,
  validateRoomUpdateForm,
  type RoomUpdateField,
  type RoomUpdateValues,
} from "./room-update-validation";

const ROOM_MANAGEMENT_ROLES = ["owner", "admin"] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RoomUpdateResult =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      code:
        | "invalid-request"
        | "invalid-fields"
        | "unexpected-fields"
        | "not-authorized"
        | "not-found"
        | "database-error";
      fieldErrors?: Partial<Record<RoomUpdateField, string>>;
    };

type RoomUpdateContext = {
  actorUserId: string;
  propertyId: string;
  roomId: string;
  occurredAt: string;
  values: RoomUpdateValues;
};

async function persistRoomUpdate(
  context: RoomUpdateContext,
): Promise<RoomUpdateResult> {
  const supabase = await createServerActionSupabaseClient();
  const { data: currentRoom, error: currentRoomError } = await supabase
    .from("rooms")
    .select("room_number, monthly_rate, location, floor")
    .eq("id", context.roomId)
    .eq("property_id", context.propertyId)
    .maybeSingle();

  if (currentRoomError) {
    return { status: "error", code: "database-error" };
  }

  if (!currentRoom) {
    return { status: "error", code: "not-found" };
  }

  if (
    !isValidPortfolioRoomConfiguration(
      currentRoom.room_number,
      context.values,
    )
  ) {
    return {
      status: "error",
      code: "invalid-fields",
      fieldErrors: {
        location: "invalid-location",
        floor: "invalid-floor",
      },
    };
  }

  const changedFields: RoomUpdateField[] = [];
  if (currentRoom.monthly_rate !== context.values.monthlyRate) {
    changedFields.push("monthlyRate");
  }
  if (currentRoom.location !== context.values.location) {
    changedFields.push("location");
  }
  if (currentRoom.floor !== context.values.floor) {
    changedFields.push("floor");
  }

  const auditContext = {
    actorUserId: context.actorUserId,
    propertyId: context.propertyId,
    roomId: context.roomId,
    changedFields,
    occurredAt: context.occurredAt,
  };

  if (auditContext.changedFields.length === 0) {
    return { status: "success" };
  }

  const { data, error } = await supabase
    .from("rooms")
    .update({
      monthly_rate: context.values.monthlyRate,
      location: context.values.location,
      floor: context.values.floor,
    })
    .eq("id", auditContext.roomId)
    .eq("property_id", auditContext.propertyId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { status: "error", code: "database-error" };
  }

  if (!data) {
    return { status: "error", code: "not-found" };
  }

  return { status: "success" };
}

export async function updateRoomConfiguration(
  roomId: string,
  formData: FormData,
): Promise<RoomUpdateResult> {
  if (!UUID_PATTERN.test(roomId)) {
    return { status: "error", code: "invalid-request" };
  }

  const access = await getPropertyAccess();
  if (
    access.status !== "authorized" ||
    !hasRole(access, ROOM_MANAGEMENT_ROLES)
  ) {
    return { status: "error", code: "not-authorized" };
  }

  const validation = validateRoomUpdateForm(formData);
  if (!validation.ok) {
    return {
      status: "error",
      code: validation.code,
      fieldErrors: validation.fieldErrors,
    };
  }

  return persistRoomUpdate({
    actorUserId: access.userId,
    propertyId: access.property.id,
    roomId,
    occurredAt: new Date().toISOString(),
    values: validation.values,
  });
}
