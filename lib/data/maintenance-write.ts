import "server-only";

import { getPropertyAccess, hasRole } from "@/lib/auth/access";
import { createServerActionSupabaseClient } from "@/lib/supabase/server";
import {
  validateMaintenanceWriteForm,
  type MaintenanceFieldError,
  type MaintenanceMutationField,
} from "./maintenance-write-validation";

const MAINTENANCE_MANAGEMENT_ROLES = ["owner", "admin"] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MaintenanceMutationResult =
  | { status: "idle" }
  | {
      status: "success";
      maintenanceId: string;
      maintenanceReference: string;
      operation: "create" | "update" | "complete" | "cancel";
    }
  | {
      status: "error";
      code:
        | "invalid-request"
        | "invalid-fields"
        | "unexpected-fields"
        | "not-authorized"
        | "not-found"
        | "invalid-transition"
        | "already-closed"
        | "database-error";
      fieldErrors?: Partial<
        Record<MaintenanceMutationField, MaintenanceFieldError>
      >;
    };

async function getAuthorizedMaintenanceContext(): Promise<
  | { ok: true; propertyId: string }
  | { ok: false; result: MaintenanceMutationResult }
> {
  const access = await getPropertyAccess();

  if (
    access.status !== "authorized" ||
    !hasRole(access, MAINTENANCE_MANAGEMENT_ROLES)
  ) {
    return {
      ok: false,
      result: { status: "error", code: "not-authorized" },
    };
  }

  return { ok: true, propertyId: access.property.id };
}

function mapDatabaseError(error: {
  code?: string | null;
}): MaintenanceMutationResult {
  if (error.code === "P2102") {
    return { status: "error", code: "invalid-transition" };
  }
  if (error.code === "P2104") {
    return { status: "error", code: "already-closed" };
  }
  if (
    error.code === "23503" ||
    error.code === "23514" ||
    error.code === "P2101"
  ) {
    return { status: "error", code: "invalid-request" };
  }

  return { status: "error", code: "database-error" };
}

async function roomBelongsToProperty(
  roomId: string | null,
  propertyId: string,
): Promise<boolean | null> {
  if (!roomId) {
    return true;
  }

  const supabase = await createServerActionSupabaseClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", roomId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return Boolean(data);
}

export async function createMaintenanceRecord(
  formData: FormData,
): Promise<MaintenanceMutationResult> {
  const authorization = await getAuthorizedMaintenanceContext();
  if (!authorization.ok) {
    return authorization.result;
  }

  const validation = validateMaintenanceWriteForm(formData, "create");
  if (!validation.ok) {
    return {
      status: "error",
      code: validation.code,
      fieldErrors: validation.fieldErrors,
    };
  }

  const validRoom = await roomBelongsToProperty(
    validation.values.roomId,
    authorization.propertyId,
  );
  if (validRoom === null) {
    return { status: "error", code: "database-error" };
  }
  if (!validRoom) {
    return { status: "error", code: "not-found" };
  }

  const supabase = await createServerActionSupabaseClient();
  const { data, error } = await supabase
    .from("maintenance_records")
    .insert({
      property_id: authorization.propertyId,
      room_id: validation.values.roomId,
      reported_date: validation.values.reportedDate,
      category: validation.values.category,
      title: validation.values.title,
      description: validation.values.description,
      priority: validation.values.priority,
      status: "open",
      vendor: validation.values.vendor,
      scheduled_date: validation.values.scheduledDate,
      estimated_cost: validation.values.estimatedCost,
      notes: validation.values.notes,
    })
    .select("id, reference")
    .single();

  if (error || !data) {
    return error
      ? mapDatabaseError(error)
      : { status: "error", code: "database-error" };
  }

  return {
    status: "success",
    maintenanceId: data.id,
    maintenanceReference: data.reference,
    operation: "create",
  };
}

export async function updateMaintenanceRecord(
  maintenanceId: string,
  formData: FormData,
): Promise<MaintenanceMutationResult> {
  if (!UUID_PATTERN.test(maintenanceId)) {
    return { status: "error", code: "invalid-request" };
  }

  const authorization = await getAuthorizedMaintenanceContext();
  if (!authorization.ok) {
    return authorization.result;
  }

  const validation = validateMaintenanceWriteForm(formData, "update");
  if (!validation.ok) {
    return {
      status: "error",
      code: validation.code,
      fieldErrors: validation.fieldErrors,
    };
  }

  const supabase = await createServerActionSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from("maintenance_records")
    .select("id, status")
    .eq("id", maintenanceId)
    .eq("property_id", authorization.propertyId)
    .maybeSingle();

  if (existingError) {
    return { status: "error", code: "database-error" };
  }
  if (!existing) {
    return { status: "error", code: "not-found" };
  }
  if (existing.status === "completed" || existing.status === "cancelled") {
    return { status: "error", code: "already-closed" };
  }
  if (existing.status === "in_progress" && validation.values.status === "open") {
    return { status: "error", code: "invalid-transition" };
  }

  const validRoom = await roomBelongsToProperty(
    validation.values.roomId,
    authorization.propertyId,
  );
  if (validRoom === null) {
    return { status: "error", code: "database-error" };
  }
  if (!validRoom) {
    return { status: "error", code: "not-found" };
  }

  const { data, error } = await supabase
    .from("maintenance_records")
    .update({
      room_id: validation.values.roomId,
      reported_date: validation.values.reportedDate,
      category: validation.values.category,
      title: validation.values.title,
      description: validation.values.description,
      priority: validation.values.priority,
      status: validation.values.status,
      vendor: validation.values.vendor,
      scheduled_date: validation.values.scheduledDate,
      completed_date: validation.values.completedDate,
      estimated_cost: validation.values.estimatedCost,
      actual_cost: validation.values.actualCost,
      resolution: validation.values.resolution,
      notes: validation.values.notes,
    })
    .eq("id", maintenanceId)
    .eq("property_id", authorization.propertyId)
    .select("id, reference")
    .maybeSingle();

  if (error) {
    return mapDatabaseError(error);
  }
  if (!data) {
    return { status: "error", code: "not-found" };
  }

  const operation =
    validation.values.status === "completed"
      ? "complete"
      : validation.values.status === "cancelled"
        ? "cancel"
        : "update";

  return {
    status: "success",
    maintenanceId: data.id,
    maintenanceReference: data.reference,
    operation,
  };
}
