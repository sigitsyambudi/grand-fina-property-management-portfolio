import {
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  PAYMENT_METHODS,
  type ExpenseCategory,
  type ExpensePaymentMethod,
  type ExpenseStatus,
} from "./types";

export const EXPENSE_WRITE_FIELDS = [
  "roomId",
  "expenseDate",
  "category",
  "description",
  "amount",
  "paymentMethod",
  "vendor",
  "status",
  "notes",
] as const;

export const EXPENSE_VOID_FIELDS = ["voidReason"] as const;

export type ExpenseWriteField = (typeof EXPENSE_WRITE_FIELDS)[number];
export type ExpenseVoidField = (typeof EXPENSE_VOID_FIELDS)[number];
export type ExpenseMutationField = ExpenseWriteField | ExpenseVoidField;

export type ExpenseWriteValues = {
  roomId: string | null;
  expenseDate: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  vendor: string | null;
  status: Extract<ExpenseStatus, "pending" | "recorded">;
  notes: string | null;
};

export type ExpenseVoidValues = {
  voidReason: string;
};

export type ExpenseFieldError =
  | "required"
  | "invalid-selection"
  | "invalid-date"
  | "invalid-amount"
  | "too-long";

export type ExpenseValidationResult<T> =
  | { ok: true; values: T }
  | {
      ok: false;
      code: "invalid-fields" | "unexpected-fields";
      fieldErrors: Partial<Record<ExpenseMutationField, ExpenseFieldError>>;
    };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_EXPENSE_AMOUNT = 1_000_000_000;
const MAX_DESCRIPTION_LENGTH = 240;
const MAX_VENDOR_LENGTH = 160;
const MAX_NOTES_LENGTH = 1000;
const MAX_VOID_REASON_LENGTH = 500;

function normalizeSingleLine(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeOptionalSingleLine(
  value: FormDataEntryValue | null,
): string | null {
  const normalized = normalizeSingleLine(value);
  return normalized === "" ? null : normalized;
}

function normalizeNotes(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function isExpenseCategory(value: string): value is ExpenseCategory {
  return EXPENSE_CATEGORIES.some((category) => category === value);
}

function isExpensePaymentMethod(
  value: string,
): value is ExpensePaymentMethod {
  return PAYMENT_METHODS.some((method) => method === value);
}

function isWritableExpenseStatus(
  value: string,
): value is Extract<ExpenseStatus, "pending" | "recorded"> {
  return (
    EXPENSE_STATUSES.some((status) => status === value) &&
    (value === "pending" || value === "recorded")
  );
}

function hasUnexpectedFields(
  formData: FormData,
  allowedFields: readonly string[],
): boolean {
  return [...formData.keys()].some(
    (key) => !key.startsWith("$ACTION_") && !allowedFields.includes(key),
  );
}

export function validateExpenseWriteForm(
  formData: FormData,
): ExpenseValidationResult<ExpenseWriteValues> {
  if (hasUnexpectedFields(formData, EXPENSE_WRITE_FIELDS)) {
    return { ok: false, code: "unexpected-fields", fieldErrors: {} };
  }

  const rawRoomId = normalizeSingleLine(formData.get("roomId"));
  const roomId = rawRoomId === "" ? null : rawRoomId;
  const expenseDate = normalizeSingleLine(formData.get("expenseDate"));
  const category = normalizeSingleLine(formData.get("category"));
  const description = normalizeSingleLine(formData.get("description"));
  const rawAmount = normalizeSingleLine(formData.get("amount"));
  const amount = parsePositiveInteger(rawAmount);
  const paymentMethod = normalizeSingleLine(formData.get("paymentMethod"));
  const vendor = normalizeOptionalSingleLine(formData.get("vendor"));
  const status = normalizeSingleLine(formData.get("status"));
  const notes = normalizeNotes(formData.get("notes"));
  const fieldErrors: Partial<
    Record<ExpenseMutationField, ExpenseFieldError>
  > = {};

  if (roomId !== null && !UUID_PATTERN.test(roomId)) {
    fieldErrors.roomId = "invalid-selection";
  }

  if (expenseDate === "") {
    fieldErrors.expenseDate = "required";
  } else if (!isValidDate(expenseDate)) {
    fieldErrors.expenseDate = "invalid-date";
  }

  if (!isExpenseCategory(category)) {
    fieldErrors.category =
      category === "" ? "required" : "invalid-selection";
  }

  if (description === "") {
    fieldErrors.description = "required";
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    fieldErrors.description = "too-long";
  }

  if (amount === null || amount < 1 || amount > MAX_EXPENSE_AMOUNT) {
    fieldErrors.amount = "invalid-amount";
  }

  if (!isExpensePaymentMethod(paymentMethod)) {
    fieldErrors.paymentMethod =
      paymentMethod === "" ? "required" : "invalid-selection";
  }

  if (vendor && vendor.length > MAX_VENDOR_LENGTH) {
    fieldErrors.vendor = "too-long";
  }

  if (!isWritableExpenseStatus(status)) {
    fieldErrors.status = status === "" ? "required" : "invalid-selection";
  }

  if (notes && notes.length > MAX_NOTES_LENGTH) {
    fieldErrors.notes = "too-long";
  }

  if (
    Object.keys(fieldErrors).length > 0 ||
    amount === null ||
    !isExpenseCategory(category) ||
    !isExpensePaymentMethod(paymentMethod) ||
    !isWritableExpenseStatus(status)
  ) {
    return { ok: false, code: "invalid-fields", fieldErrors };
  }

  return {
    ok: true,
    values: {
      roomId,
      expenseDate,
      category,
      description,
      amount,
      paymentMethod,
      vendor,
      status,
      notes,
    },
  };
}

export function validateExpenseVoidForm(
  formData: FormData,
): ExpenseValidationResult<ExpenseVoidValues> {
  if (hasUnexpectedFields(formData, EXPENSE_VOID_FIELDS)) {
    return { ok: false, code: "unexpected-fields", fieldErrors: {} };
  }

  const voidReason = normalizeSingleLine(formData.get("voidReason"));
  const fieldErrors: Partial<
    Record<ExpenseMutationField, ExpenseFieldError>
  > = {};

  if (voidReason === "") {
    fieldErrors.voidReason = "required";
  } else if (voidReason.length > MAX_VOID_REASON_LENGTH) {
    fieldErrors.voidReason = "too-long";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, code: "invalid-fields", fieldErrors };
  }

  return { ok: true, values: { voidReason } };
}
