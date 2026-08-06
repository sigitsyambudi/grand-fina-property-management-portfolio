import "server-only";

import { getPropertyAccess, hasRole } from "@/lib/auth/access";
import { createServerActionSupabaseClient } from "@/lib/supabase/server";
import {
  validateLeaseCreateForm,
  validateLeaseUpdateForm,
  type LeaseFieldError,
  type LeaseWriteField,
} from "./lease-write-validation";

const LEASE_MANAGEMENT_ROLES = ["owner", "admin"] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LeaseMutationResult =
  | { status: "idle" }
  | { status: "success"; leaseId: string }
  | {
      status: "error";
      code:
        | "invalid-request"
        | "invalid-fields"
        | "unexpected-fields"
        | "not-authorized"
        | "not-found"
        | "tenant-unavailable"
        | "room-unavailable"
        | "conflict"
        | "database-error";
      fieldErrors?: Partial<Record<LeaseWriteField, LeaseFieldError>>;
    };

type AuthorizedLeaseContext = {
  propertyId: string;
};

async function getAuthorizedLeaseContext(): Promise<
  | { ok: true; context: AuthorizedLeaseContext }
  | { ok: false; result: LeaseMutationResult }
> {
  const access = await getPropertyAccess();

  if (
    access.status !== "authorized" ||
    !hasRole(access, LEASE_MANAGEMENT_ROLES)
  ) {
    return {
      ok: false,
      result: { status: "error", code: "not-authorized" },
    };
  }

  return {
    ok: true,
    context: {
      propertyId: access.property.id,
    },
  };
}

function mapDatabaseError(error: { code?: string | null }): LeaseMutationResult {
  if (error.code === "P1601") {
    return { status: "error", code: "room-unavailable" };
  }

  if (error.code === "P1602") {
    return { status: "error", code: "tenant-unavailable" };
  }

  if (error.code === "23505") {
    return { status: "error", code: "conflict" };
  }

  if (
    error.code === "23503" ||
    error.code === "23514" ||
    error.code === "P1603" ||
    error.code === "P1604"
  ) {
    return { status: "error", code: "invalid-request" };
  }

  return { status: "error", code: "database-error" };
}

export async function createActiveLease(
  formData: FormData,
): Promise<LeaseMutationResult> {
  const authorization = await getAuthorizedLeaseContext();
  if (!authorization.ok) {
    return authorization.result;
  }

  const validation = validateLeaseCreateForm(formData);
  if (!validation.ok) {
    return {
      status: "error",
      code: validation.code,
      fieldErrors: validation.fieldErrors,
    };
  }

  const supabase = await createServerActionSupabaseClient();
  const { data, error } = await supabase
    .from("leases")
    .insert({
      property_id: authorization.context.propertyId,
      tenant_id: validation.values.tenantId,
      room_id: validation.values.roomId,
      status: "active",
      start_date: validation.values.startDate,
      end_date: validation.values.endDate,
      monthly_rent: validation.values.monthlyRent,
      billing_day: validation.values.billingDay,
      notes: validation.values.notes,
    })
    .select("id")
    .single();

  if (error || !data) {
    return error
      ? mapDatabaseError(error)
      : { status: "error", code: "database-error" };
  }

  return { status: "success", leaseId: data.id };
}

export async function updateActiveLease(
  leaseId: string,
  formData: FormData,
): Promise<LeaseMutationResult> {
  if (!UUID_PATTERN.test(leaseId)) {
    return { status: "error", code: "invalid-request" };
  }

  const authorization = await getAuthorizedLeaseContext();
  if (!authorization.ok) {
    return authorization.result;
  }

  const validation = validateLeaseUpdateForm(formData);
  if (!validation.ok) {
    return {
      status: "error",
      code: validation.code,
      fieldErrors: validation.fieldErrors,
    };
  }

  const supabase = await createServerActionSupabaseClient();
  const { data: currentLease, error: currentLeaseError } = await supabase
    .from("leases")
    .select("id, status")
    .eq("id", leaseId)
    .eq("property_id", authorization.context.propertyId)
    .maybeSingle();

  if (currentLeaseError) {
    return { status: "error", code: "database-error" };
  }

  if (!currentLease) {
    return { status: "error", code: "not-found" };
  }

  if (currentLease.status !== "active") {
    return { status: "error", code: "invalid-request" };
  }

  const { data, error } = await supabase
    .from("leases")
    .update({
      start_date: validation.values.startDate,
      end_date: validation.values.endDate,
      monthly_rent: validation.values.monthlyRent,
      billing_day: validation.values.billingDay,
      notes: validation.values.notes,
    })
    .eq("id", leaseId)
    .eq("property_id", authorization.context.propertyId)
    .select("id")
    .maybeSingle();

  if (error) {
    return mapDatabaseError(error);
  }

  if (!data) {
    return { status: "error", code: "not-found" };
  }

  return { status: "success", leaseId: data.id };
}
