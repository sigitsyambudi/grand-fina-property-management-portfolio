"use server";

import { revalidatePath } from "next/cache";
import {
  createMaintenanceRecord,
  updateMaintenanceRecord,
  type MaintenanceMutationResult,
} from "@/lib/data/maintenance-write";

function revalidateMaintenanceRoutes(
  maintenanceId: string,
  maintenanceReference: string,
): void {
  revalidatePath("/");
  revalidatePath("/maintenance");
  revalidatePath(`/maintenance/${maintenanceId}`);
  revalidatePath(`/maintenance/${maintenanceReference}`);
  revalidatePath("/reports");
  revalidatePath("/settings");
}

export async function createMaintenanceAction(
  _previousState: MaintenanceMutationResult,
  formData: FormData,
): Promise<MaintenanceMutationResult> {
  const result = await createMaintenanceRecord(formData);

  if (result.status === "success") {
    revalidateMaintenanceRoutes(
      result.maintenanceId,
      result.maintenanceReference,
    );
  }

  return result;
}

export async function updateMaintenanceAction(
  maintenanceId: string,
  _previousState: MaintenanceMutationResult,
  formData: FormData,
): Promise<MaintenanceMutationResult> {
  const result = await updateMaintenanceRecord(maintenanceId, formData);

  if (result.status === "success") {
    revalidateMaintenanceRoutes(
      result.maintenanceId,
      result.maintenanceReference,
    );
  }

  return result;
}
