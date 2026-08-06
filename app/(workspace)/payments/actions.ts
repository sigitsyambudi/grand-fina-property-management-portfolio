"use server";

import { revalidatePath } from "next/cache";
import {
  createPayment,
  updatePaymentNotes,
  type PaymentMutationResult,
} from "@/lib/data/payment-write";

function revalidatePaymentRoutes(
  paymentId: string,
  invoiceId: string,
): void {
  revalidatePath("/");
  revalidatePath("/payments");
  revalidatePath(`/payments/${paymentId}`);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/reports");
}

export async function createPaymentAction(
  _previousState: PaymentMutationResult,
  formData: FormData,
): Promise<PaymentMutationResult> {
  const result = await createPayment(formData);

  if (result.status === "success") {
    revalidatePaymentRoutes(result.paymentId, result.invoiceId);
  }

  return result;
}

export async function updatePaymentNotesAction(
  paymentId: string,
  _previousState: PaymentMutationResult,
  formData: FormData,
): Promise<PaymentMutationResult> {
  const result = await updatePaymentNotes(paymentId, formData);

  if (result.status === "success") {
    revalidatePaymentRoutes(result.paymentId, result.invoiceId);
  }

  return result;
}
