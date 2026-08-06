import "server-only";

import { getPropertyAccess, hasRole } from "@/lib/auth/access";
import { createServerActionSupabaseClient } from "@/lib/supabase/server";
import {
  validatePaymentCreateForm,
  validatePaymentUpdateForm,
  type PaymentFieldError,
  type PaymentWriteField,
} from "./payment-write-validation";

const PAYMENT_MANAGEMENT_ROLES = ["owner", "admin"] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PaymentMutationResult =
  | { status: "idle" }
  | { status: "success"; paymentId: string; invoiceId: string }
  | {
      status: "error";
      code:
        | "invalid-request"
        | "invalid-fields"
        | "unexpected-fields"
        | "not-authorized"
        | "not-found"
        | "invoice-paid"
        | "amount-exceeds-balance"
        | "database-error";
      fieldErrors?: Partial<Record<PaymentWriteField, PaymentFieldError>>;
    };

type AuthorizedPaymentContext = {
  propertyId: string;
};

async function getAuthorizedPaymentContext(): Promise<
  | { ok: true; context: AuthorizedPaymentContext }
  | { ok: false; result: PaymentMutationResult }
> {
  const access = await getPropertyAccess();

  if (
    access.status !== "authorized" ||
    !hasRole(access, PAYMENT_MANAGEMENT_ROLES)
  ) {
    return {
      ok: false,
      result: { status: "error", code: "not-authorized" },
    };
  }

  return {
    ok: true,
    context: { propertyId: access.property.id },
  };
}

function mapDatabaseError(error: {
  code?: string | null;
}): PaymentMutationResult {
  if (error.code === "P1803") {
    return { status: "error", code: "amount-exceeds-balance" };
  }

  if (
    error.code === "23503" ||
    error.code === "23514" ||
    error.code === "P1801" ||
    error.code === "P1802"
  ) {
    return { status: "error", code: "invalid-request" };
  }

  return { status: "error", code: "database-error" };
}

export async function createPayment(
  formData: FormData,
): Promise<PaymentMutationResult> {
  const authorization = await getAuthorizedPaymentContext();
  if (!authorization.ok) {
    return authorization.result;
  }

  const validation = validatePaymentCreateForm(formData);
  if (!validation.ok) {
    return {
      status: "error",
      code: validation.code,
      fieldErrors: validation.fieldErrors,
    };
  }

  const supabase = await createServerActionSupabaseClient();
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, amount")
    .eq("id", validation.values.invoiceId)
    .eq("property_id", authorization.context.propertyId)
    .maybeSingle();

  if (invoiceError) {
    return { status: "error", code: "database-error" };
  }

  if (!invoice) {
    return { status: "error", code: "not-found" };
  }

  const { data: completedPayments, error: paymentError } = await supabase
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoice.id)
    .eq("status", "completed");

  if (paymentError) {
    return { status: "error", code: "database-error" };
  }

  const paidAmount = completedPayments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  const remainingBalance = invoice.amount - paidAmount;

  if (remainingBalance <= 0) {
    return { status: "error", code: "invoice-paid" };
  }

  if (validation.values.amount > remainingBalance) {
    return { status: "error", code: "amount-exceeds-balance" };
  }

  const { data, error } = await supabase
    .from("payments")
    .insert({
      property_id: authorization.context.propertyId,
      invoice_id: validation.values.invoiceId,
      amount: validation.values.amount,
      payment_date: validation.values.paymentDate,
      method: validation.values.method,
      notes: validation.values.notes,
    })
    .select("id, invoice_id")
    .single();

  if (error || !data) {
    return error
      ? mapDatabaseError(error)
      : { status: "error", code: "database-error" };
  }

  return {
    status: "success",
    paymentId: data.id,
    invoiceId: data.invoice_id,
  };
}

export async function updatePaymentNotes(
  paymentId: string,
  formData: FormData,
): Promise<PaymentMutationResult> {
  if (!UUID_PATTERN.test(paymentId)) {
    return { status: "error", code: "invalid-request" };
  }

  const authorization = await getAuthorizedPaymentContext();
  if (!authorization.ok) {
    return authorization.result;
  }

  const validation = validatePaymentUpdateForm(formData);
  if (!validation.ok) {
    return {
      status: "error",
      code: validation.code,
      fieldErrors: validation.fieldErrors,
    };
  }

  const supabase = await createServerActionSupabaseClient();
  const { data, error } = await supabase
    .from("payments")
    .update({ notes: validation.values.notes })
    .eq("id", paymentId)
    .eq("property_id", authorization.context.propertyId)
    .select("id, invoice_id")
    .maybeSingle();

  if (error) {
    return mapDatabaseError(error);
  }

  if (!data) {
    return { status: "error", code: "not-found" };
  }

  return {
    status: "success",
    paymentId: data.id,
    invoiceId: data.invoice_id,
  };
}
