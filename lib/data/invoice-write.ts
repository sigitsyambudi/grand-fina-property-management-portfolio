import "server-only";

import { getPropertyAccess, hasRole } from "@/lib/auth/access";
import { createServerActionSupabaseClient } from "@/lib/supabase/server";
import {
  deriveInvoiceDueDate,
  isDateInBillingPeriod,
  toBillingPeriodDate,
  validateInvoiceCreateForm,
  validateInvoiceUpdateForm,
  type InvoiceFieldError,
  type InvoiceWriteField,
} from "./invoice-write-validation";

const INVOICE_MANAGEMENT_ROLES = ["owner", "admin"] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type InvoiceMutationResult =
  | { status: "idle" }
  | { status: "success"; invoiceId: string }
  | {
      status: "error";
      code:
        | "invalid-request"
        | "invalid-fields"
        | "unexpected-fields"
        | "not-authorized"
        | "not-found"
        | "lease-not-billable"
        | "duplicate"
        | "payment-protected"
        | "database-error";
      fieldErrors?: Partial<Record<InvoiceWriteField, InvoiceFieldError>>;
    };

type AuthorizedInvoiceContext = {
  propertyId: string;
};

async function getAuthorizedInvoiceContext(): Promise<
  | { ok: true; context: AuthorizedInvoiceContext }
  | { ok: false; result: InvoiceMutationResult }
> {
  const access = await getPropertyAccess();

  if (
    access.status !== "authorized" ||
    !hasRole(access, INVOICE_MANAGEMENT_ROLES)
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
}): InvoiceMutationResult {
  if (error.code === "23505") {
    return { status: "error", code: "duplicate" };
  }

  if (error.code === "P1702") {
    return { status: "error", code: "lease-not-billable" };
  }

  if (error.code === "P1704" || error.code === "P1705") {
    return { status: "error", code: "payment-protected" };
  }

  if (
    error.code === "23503" ||
    error.code === "23514" ||
    error.code === "P1701" ||
    error.code === "P1703"
  ) {
    return { status: "error", code: "invalid-request" };
  }

  return { status: "error", code: "database-error" };
}

function isLeaseBillableForPeriod(
  startDate: string,
  endDate: string | null,
  billingPeriod: string,
): boolean {
  const periodStart = toBillingPeriodDate(billingPeriod);
  const [year, month] = billingPeriod.split("-").map(Number);
  const periodEnd = new Date(Date.UTC(year, month, 0))
    .toISOString()
    .slice(0, 10);

  return startDate <= periodEnd && (!endDate || endDate >= periodStart);
}

export async function createInvoice(
  formData: FormData,
): Promise<InvoiceMutationResult> {
  const authorization = await getAuthorizedInvoiceContext();
  if (!authorization.ok) {
    return authorization.result;
  }

  const validation = validateInvoiceCreateForm(formData);
  if (!validation.ok) {
    return {
      status: "error",
      code: validation.code,
      fieldErrors: validation.fieldErrors,
    };
  }

  const supabase = await createServerActionSupabaseClient();
  const { data: lease, error: leaseError } = await supabase
    .from("leases")
    .select("id, start_date, end_date, billing_day")
    .eq("id", validation.values.leaseId)
    .eq("property_id", authorization.context.propertyId)
    .maybeSingle();

  if (leaseError) {
    return { status: "error", code: "database-error" };
  }

  if (!lease) {
    return { status: "error", code: "not-found" };
  }

  if (
    !isLeaseBillableForPeriod(
      lease.start_date,
      lease.end_date,
      validation.values.billingPeriod,
    )
  ) {
    return { status: "error", code: "lease-not-billable" };
  }

  const expectedDueDate = deriveInvoiceDueDate(
    validation.values.billingPeriod,
    lease.billing_day,
  );
  if (validation.values.dueDate !== expectedDueDate) {
    return {
      status: "error",
      code: "invalid-fields",
      fieldErrors: { dueDate: "invalid-due-date" },
    };
  }

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      property_id: authorization.context.propertyId,
      lease_id: validation.values.leaseId,
      billing_period: toBillingPeriodDate(
        validation.values.billingPeriod,
      ),
      issue_date: validation.values.issueDate,
      due_date: validation.values.dueDate,
      amount: validation.values.amount,
      notes: validation.values.notes,
    })
    .select("id")
    .single();

  if (error || !data) {
    return error
      ? mapDatabaseError(error)
      : { status: "error", code: "database-error" };
  }

  return { status: "success", invoiceId: data.id };
}

export async function updateInvoice(
  invoiceId: string,
  formData: FormData,
): Promise<InvoiceMutationResult> {
  if (!UUID_PATTERN.test(invoiceId)) {
    return { status: "error", code: "invalid-request" };
  }

  const authorization = await getAuthorizedInvoiceContext();
  if (!authorization.ok) {
    return authorization.result;
  }

  const validation = validateInvoiceUpdateForm(formData);
  if (!validation.ok) {
    return {
      status: "error",
      code: validation.code,
      fieldErrors: validation.fieldErrors,
    };
  }

  const supabase = await createServerActionSupabaseClient();
  const { data: currentInvoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, billing_period, amount")
    .eq("id", invoiceId)
    .eq("property_id", authorization.context.propertyId)
    .maybeSingle();

  if (invoiceError) {
    return { status: "error", code: "database-error" };
  }

  if (!currentInvoice) {
    return { status: "error", code: "not-found" };
  }

  const billingPeriod = currentInvoice.billing_period.slice(0, 7);
  if (!isDateInBillingPeriod(validation.values.dueDate, billingPeriod)) {
    return {
      status: "error",
      code: "invalid-fields",
      fieldErrors: { dueDate: "invalid-due-date" },
    };
  }

  if (validation.values.amount !== currentInvoice.amount) {
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id")
      .eq("invoice_id", invoiceId)
      .limit(1)
      .maybeSingle();

    if (paymentError) {
      return { status: "error", code: "database-error" };
    }

    if (payment) {
      return { status: "error", code: "payment-protected" };
    }
  }

  const { data, error } = await supabase
    .from("invoices")
    .update({
      issue_date: validation.values.issueDate,
      due_date: validation.values.dueDate,
      amount: validation.values.amount,
      notes: validation.values.notes,
    })
    .eq("id", invoiceId)
    .eq("property_id", authorization.context.propertyId)
    .select("id")
    .maybeSingle();

  if (error) {
    return mapDatabaseError(error);
  }

  if (!data) {
    return { status: "error", code: "not-found" };
  }

  return { status: "success", invoiceId: data.id };
}
