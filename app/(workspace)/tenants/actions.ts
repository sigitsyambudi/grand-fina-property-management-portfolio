"use server";

import { revalidatePath } from "next/cache";
import {
  createTenant,
  updateTenant,
  type TenantMutationResult,
} from "@/lib/data/tenant-write";

function revalidateTenantRoutes(tenantId: string): void {
  revalidatePath("/");
  revalidatePath("/tenants");
  revalidatePath(`/tenants/${tenantId}`);
  revalidatePath("/rooms");
  revalidatePath("/leases");
  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath("/reports");
}

export async function createTenantAction(
  _previousState: TenantMutationResult,
  formData: FormData,
): Promise<TenantMutationResult> {
  const result = await createTenant(formData);

  if (result.status === "success") {
    revalidateTenantRoutes(result.tenantId);
  }

  return result;
}

export async function updateTenantAction(
  tenantId: string,
  _previousState: TenantMutationResult,
  formData: FormData,
): Promise<TenantMutationResult> {
  const result = await updateTenant(tenantId, formData);

  if (result.status === "success") {
    revalidateTenantRoutes(result.tenantId);
  }

  return result;
}
