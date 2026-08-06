import "server-only";

import { getPropertyAccess, hasRole } from "@/lib/auth/access";
import { createServerActionSupabaseClient } from "@/lib/supabase/server";
import {
  validateExpenseVoidForm,
  validateExpenseWriteForm,
  type ExpenseFieldError,
  type ExpenseMutationField,
} from "./expense-write-validation";

const EXPENSE_MANAGEMENT_ROLES = ["owner", "admin"] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ExpenseMutationResult =
  | { status: "idle" }
  | { status: "success"; expenseId: string; operation: "create" | "update" | "void" }
  | {
      status: "error";
      code:
        | "invalid-request"
        | "invalid-fields"
        | "unexpected-fields"
        | "not-authorized"
        | "not-found"
        | "invalid-transition"
        | "recorded-fields-immutable"
        | "already-void"
        | "database-error";
      fieldErrors?: Partial<
        Record<ExpenseMutationField, ExpenseFieldError>
      >;
    };

type AuthorizedExpenseContext = {
  propertyId: string;
};

async function getAuthorizedExpenseContext(): Promise<
  | { ok: true; context: AuthorizedExpenseContext }
  | { ok: false; result: ExpenseMutationResult }
> {
  const access = await getPropertyAccess();

  if (
    access.status !== "authorized" ||
    !hasRole(access, EXPENSE_MANAGEMENT_ROLES)
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
}): ExpenseMutationResult {
  if (error.code === "P2002") {
    return { status: "error", code: "invalid-transition" };
  }

  if (error.code === "P2003") {
    return { status: "error", code: "recorded-fields-immutable" };
  }

  if (error.code === "P2004") {
    return { status: "error", code: "already-void" };
  }

  if (
    error.code === "23503" ||
    error.code === "23514" ||
    error.code === "P2001"
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

export async function createExpense(
  formData: FormData,
): Promise<ExpenseMutationResult> {
  const authorization = await getAuthorizedExpenseContext();
  if (!authorization.ok) {
    return authorization.result;
  }

  const validation = validateExpenseWriteForm(formData);
  if (!validation.ok) {
    return {
      status: "error",
      code: validation.code,
      fieldErrors: validation.fieldErrors,
    };
  }

  const validRoom = await roomBelongsToProperty(
    validation.values.roomId,
    authorization.context.propertyId,
  );
  if (validRoom === null) {
    return { status: "error", code: "database-error" };
  }
  if (!validRoom) {
    return { status: "error", code: "not-found" };
  }

  const supabase = await createServerActionSupabaseClient();
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      property_id: authorization.context.propertyId,
      room_id: validation.values.roomId,
      expense_date: validation.values.expenseDate,
      category: validation.values.category,
      description: validation.values.description,
      amount: validation.values.amount,
      payment_method: validation.values.paymentMethod,
      vendor: validation.values.vendor,
      status: validation.values.status,
      notes: validation.values.notes,
    })
    .select("id")
    .single();

  if (error || !data) {
    return error
      ? mapDatabaseError(error)
      : { status: "error", code: "database-error" };
  }

  return { status: "success", expenseId: data.id, operation: "create" };
}

export async function updateExpense(
  expenseId: string,
  formData: FormData,
): Promise<ExpenseMutationResult> {
  if (!UUID_PATTERN.test(expenseId)) {
    return { status: "error", code: "invalid-request" };
  }

  const authorization = await getAuthorizedExpenseContext();
  if (!authorization.ok) {
    return authorization.result;
  }

  const validation = validateExpenseWriteForm(formData);
  if (!validation.ok) {
    return {
      status: "error",
      code: validation.code,
      fieldErrors: validation.fieldErrors,
    };
  }

  const supabase = await createServerActionSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from("expenses")
    .select("id, status")
    .eq("id", expenseId)
    .eq("property_id", authorization.context.propertyId)
    .maybeSingle();

  if (existingError) {
    return { status: "error", code: "database-error" };
  }
  if (!existing) {
    return { status: "error", code: "not-found" };
  }
  if (existing.status === "void") {
    return { status: "error", code: "already-void" };
  }

  const validRoom = await roomBelongsToProperty(
    validation.values.roomId,
    authorization.context.propertyId,
  );
  if (validRoom === null) {
    return { status: "error", code: "database-error" };
  }
  if (!validRoom) {
    return { status: "error", code: "not-found" };
  }

  const update =
    existing.status === "recorded"
      ? { notes: validation.values.notes }
      : {
          room_id: validation.values.roomId,
          expense_date: validation.values.expenseDate,
          category: validation.values.category,
          description: validation.values.description,
          amount: validation.values.amount,
          payment_method: validation.values.paymentMethod,
          vendor: validation.values.vendor,
          status: validation.values.status,
          notes: validation.values.notes,
        };
  const { data, error } = await supabase
    .from("expenses")
    .update(update)
    .eq("id", expenseId)
    .eq("property_id", authorization.context.propertyId)
    .select("id")
    .maybeSingle();

  if (error) {
    return mapDatabaseError(error);
  }
  if (!data) {
    return { status: "error", code: "not-found" };
  }

  return { status: "success", expenseId: data.id, operation: "update" };
}

export async function voidExpense(
  expenseId: string,
  formData: FormData,
): Promise<ExpenseMutationResult> {
  if (!UUID_PATTERN.test(expenseId)) {
    return { status: "error", code: "invalid-request" };
  }

  const authorization = await getAuthorizedExpenseContext();
  if (!authorization.ok) {
    return authorization.result;
  }

  const validation = validateExpenseVoidForm(formData);
  if (!validation.ok) {
    return {
      status: "error",
      code: validation.code,
      fieldErrors: validation.fieldErrors,
    };
  }

  const supabase = await createServerActionSupabaseClient();
  const { data, error } = await supabase
    .from("expenses")
    .update({
      status: "void",
      void_reason: validation.values.voidReason,
    })
    .eq("id", expenseId)
    .eq("property_id", authorization.context.propertyId)
    .neq("status", "void")
    .select("id")
    .maybeSingle();

  if (error) {
    return mapDatabaseError(error);
  }
  if (!data) {
    const { data: existing, error: existingError } = await supabase
      .from("expenses")
      .select("id")
      .eq("id", expenseId)
      .eq("property_id", authorization.context.propertyId)
      .maybeSingle();

    if (existingError) {
      return { status: "error", code: "database-error" };
    }

    return {
      status: "error",
      code: existing ? "already-void" : "not-found",
    };
  }

  return { status: "success", expenseId: data.id, operation: "void" };
}
