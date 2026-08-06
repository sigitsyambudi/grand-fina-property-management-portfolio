"use server";

import { revalidatePath } from "next/cache";
import {
  createInvoice,
  updateInvoice,
  type InvoiceMutationResult,
} from "@/lib/data/invoice-write";

function revalidateInvoiceRoutes(invoiceId: string): void {
  revalidatePath("/");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/reports");
}

export async function createInvoiceAction(
  _previousState: InvoiceMutationResult,
  formData: FormData,
): Promise<InvoiceMutationResult> {
  const result = await createInvoice(formData);

  if (result.status === "success") {
    revalidateInvoiceRoutes(result.invoiceId);
  }

  return result;
}

export async function updateInvoiceAction(
  invoiceId: string,
  _previousState: InvoiceMutationResult,
  formData: FormData,
): Promise<InvoiceMutationResult> {
  const result = await updateInvoice(invoiceId, formData);

  if (result.status === "success") {
    revalidateInvoiceRoutes(result.invoiceId);
  }

  return result;
}
