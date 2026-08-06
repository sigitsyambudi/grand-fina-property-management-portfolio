"use server";

import { revalidatePath } from "next/cache";
import {
  createActiveLease,
  updateActiveLease,
  type LeaseMutationResult,
} from "@/lib/data/lease-write";

function revalidateLeaseRoutes(leaseId: string): void {
  revalidatePath("/");
  revalidatePath("/rooms");
  revalidatePath("/tenants");
  revalidatePath("/leases");
  revalidatePath(`/leases/${leaseId}`);
  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath("/reports");
}

export async function createLeaseAction(
  _previousState: LeaseMutationResult,
  formData: FormData,
): Promise<LeaseMutationResult> {
  const result = await createActiveLease(formData);

  if (result.status === "success") {
    revalidateLeaseRoutes(result.leaseId);
  }

  return result;
}

export async function updateLeaseAction(
  leaseId: string,
  _previousState: LeaseMutationResult,
  formData: FormData,
): Promise<LeaseMutationResult> {
  const result = await updateActiveLease(leaseId, formData);

  if (result.status === "success") {
    revalidateLeaseRoutes(result.leaseId);
  }

  return result;
}
