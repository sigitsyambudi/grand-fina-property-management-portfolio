import "server-only";

import { getPropertyAccess, hasRole } from "@/lib/auth/access";
import { createServerActionSupabaseClient } from "@/lib/supabase/server";
import {
  TENANT_WRITE_FIELDS,
  validateTenantForm,
  type TenantFieldError,
  type TenantWriteField,
  type TenantWriteValues,
} from "./tenant-write-validation";

const TENANT_MANAGEMENT_ROLES = ["owner", "admin"] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TenantMutationResult =
  | { status: "idle" }
  | { status: "success"; tenantId: string }
  | {
      status: "error";
      code:
        | "invalid-request"
        | "invalid-fields"
        | "unexpected-fields"
        | "not-authorized"
        | "not-found"
        | "database-error";
      fieldErrors?: Partial<Record<TenantWriteField, TenantFieldError>>;
    };

type TenantMutationContext = {
  actorUserId: string;
  propertyId: string;
  tenantId?: string;
  occurredAt: string;
  values: TenantWriteValues;
};

function toDatabaseValues(values: TenantWriteValues) {
  return {
    full_name: values.fullName,
    preferred_name: values.preferredName,
    phone: values.phone,
    email: values.email,
    occupation: values.occupation,
    company_or_institution: values.companyOrInstitution,
    emergency_contact_name: values.emergencyContactName,
    emergency_contact_phone: values.emergencyContactPhone,
    notes: values.notes,
  };
}

async function createPendingTenant(
  context: TenantMutationContext,
): Promise<TenantMutationResult> {
  const supabase = await createServerActionSupabaseClient();
  const { data, error } = await supabase
    .from("tenants")
    .insert({
      property_id: context.propertyId,
      ...toDatabaseValues(context.values),
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { status: "error", code: "database-error" };
  }

  const auditContext = {
    actorUserId: context.actorUserId,
    propertyId: context.propertyId,
    tenantId: data.id,
    changedFields: TENANT_WRITE_FIELDS,
    occurredAt: context.occurredAt,
  };

  return { status: "success", tenantId: auditContext.tenantId };
}

async function updateExistingTenant(
  context: TenantMutationContext & { tenantId: string },
): Promise<TenantMutationResult> {
  const supabase = await createServerActionSupabaseClient();
  const { data: currentTenant, error: currentTenantError } = await supabase
    .from("tenants")
    .select(
      "full_name, preferred_name, phone, email, occupation, company_or_institution, emergency_contact_name, emergency_contact_phone, notes",
    )
    .eq("id", context.tenantId)
    .eq("property_id", context.propertyId)
    .maybeSingle();

  if (currentTenantError) {
    return { status: "error", code: "database-error" };
  }

  if (!currentTenant) {
    return { status: "error", code: "not-found" };
  }

  const databaseValues = toDatabaseValues(context.values);
  const currentValues = {
    fullName: currentTenant.full_name,
    preferredName: currentTenant.preferred_name,
    phone: currentTenant.phone,
    email: currentTenant.email,
    occupation: currentTenant.occupation,
    companyOrInstitution: currentTenant.company_or_institution,
    emergencyContactName: currentTenant.emergency_contact_name,
    emergencyContactPhone: currentTenant.emergency_contact_phone,
    notes: currentTenant.notes,
  } satisfies TenantWriteValues;
  const changedFields = TENANT_WRITE_FIELDS.filter(
    (field) => currentValues[field] !== context.values[field],
  );
  const auditContext = {
    actorUserId: context.actorUserId,
    propertyId: context.propertyId,
    tenantId: context.tenantId,
    changedFields,
    occurredAt: context.occurredAt,
  };

  if (auditContext.changedFields.length === 0) {
    return { status: "success", tenantId: auditContext.tenantId };
  }

  const { data, error } = await supabase
    .from("tenants")
    .update(databaseValues)
    .eq("id", auditContext.tenantId)
    .eq("property_id", auditContext.propertyId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { status: "error", code: "database-error" };
  }

  if (!data) {
    return { status: "error", code: "not-found" };
  }

  return { status: "success", tenantId: data.id };
}

async function getAuthorizedTenantContext(formData: FormData) {
  const access = await getPropertyAccess();
  if (
    access.status !== "authorized" ||
    !hasRole(access, TENANT_MANAGEMENT_ROLES)
  ) {
    return { ok: false as const, result: { status: "error", code: "not-authorized" } as const };
  }

  const validation = validateTenantForm(formData);
  if (!validation.ok) {
    return {
      ok: false as const,
      result: {
        status: "error",
        code: validation.code,
        fieldErrors: validation.fieldErrors,
      } as const,
    };
  }

  return {
    ok: true as const,
    context: {
      actorUserId: access.userId,
      propertyId: access.property.id,
      occurredAt: new Date().toISOString(),
      values: validation.values,
    },
  };
}

export async function createTenant(
  formData: FormData,
): Promise<TenantMutationResult> {
  const authorization = await getAuthorizedTenantContext(formData);
  if (!authorization.ok) {
    return authorization.result;
  }

  return createPendingTenant(authorization.context);
}

export async function updateTenant(
  tenantId: string,
  formData: FormData,
): Promise<TenantMutationResult> {
  if (!UUID_PATTERN.test(tenantId)) {
    return { status: "error", code: "invalid-request" };
  }

  const authorization = await getAuthorizedTenantContext(formData);
  if (!authorization.ok) {
    return authorization.result;
  }

  return updateExistingTenant({
    ...authorization.context,
    tenantId,
  });
}
