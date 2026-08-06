import { PAYMENT_METHODS, type PaymentMethod } from "./types";

export const PAYMENT_CREATE_FIELDS = [
  "invoiceId",
  "paymentDate",
  "amount",
  "method",
  "notes",
] as const;

export const PAYMENT_UPDATE_FIELDS = ["notes"] as const;

export type PaymentCreateField = (typeof PAYMENT_CREATE_FIELDS)[number];
export type PaymentWriteField = PaymentCreateField;

export type PaymentCreateValues = {
  invoiceId: string;
  paymentDate: string;
  amount: number;
  method: PaymentMethod;
  notes: string | null;
};

export type PaymentUpdateValues = {
  notes: string | null;
};

export type PaymentFieldError =
  | "required"
  | "invalid-selection"
  | "invalid-date"
  | "invalid-amount"
  | "too-long";

export type PaymentValidationResult<T> =
  | { ok: true; values: T }
  | {
      ok: false;
      code: "invalid-fields" | "unexpected-fields";
      fieldErrors: Partial<Record<PaymentWriteField, PaymentFieldError>>;
    };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PAYMENT_AMOUNT = 1_000_000_000;
const MAX_NOTES_LENGTH = 1000;

function normalizeSingleLine(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
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

function isPaymentMethod(value: string): value is PaymentMethod {
  return PAYMENT_METHODS.some((method) => method === value);
}

function hasUnexpectedFields(
  formData: FormData,
  allowedFields: readonly string[],
): boolean {
  return [...formData.keys()].some(
    (key) => !key.startsWith("$ACTION_") && !allowedFields.includes(key),
  );
}

export function validatePaymentCreateForm(
  formData: FormData,
): PaymentValidationResult<PaymentCreateValues> {
  if (hasUnexpectedFields(formData, PAYMENT_CREATE_FIELDS)) {
    return { ok: false, code: "unexpected-fields", fieldErrors: {} };
  }

  const invoiceId = normalizeSingleLine(formData.get("invoiceId"));
  const paymentDate = normalizeSingleLine(formData.get("paymentDate"));
  const rawAmount = normalizeSingleLine(formData.get("amount"));
  const amount = parsePositiveInteger(rawAmount);
  const method = normalizeSingleLine(formData.get("method"));
  const notes = normalizeNotes(formData.get("notes"));
  const fieldErrors: Partial<
    Record<PaymentWriteField, PaymentFieldError>
  > = {};

  if (!UUID_PATTERN.test(invoiceId)) {
    fieldErrors.invoiceId =
      invoiceId === "" ? "required" : "invalid-selection";
  }

  if (paymentDate === "") {
    fieldErrors.paymentDate = "required";
  } else if (!isValidDate(paymentDate)) {
    fieldErrors.paymentDate = "invalid-date";
  }

  if (amount === null || amount < 1 || amount > MAX_PAYMENT_AMOUNT) {
    fieldErrors.amount = "invalid-amount";
  }

  if (!isPaymentMethod(method)) {
    fieldErrors.method = method === "" ? "required" : "invalid-selection";
  }

  if (notes && notes.length > MAX_NOTES_LENGTH) {
    fieldErrors.notes = "too-long";
  }

  if (
    Object.keys(fieldErrors).length > 0 ||
    amount === null ||
    !isPaymentMethod(method)
  ) {
    return { ok: false, code: "invalid-fields", fieldErrors };
  }

  return {
    ok: true,
    values: {
      invoiceId,
      paymentDate,
      amount,
      method,
      notes,
    },
  };
}

export function validatePaymentUpdateForm(
  formData: FormData,
): PaymentValidationResult<PaymentUpdateValues> {
  if (hasUnexpectedFields(formData, PAYMENT_UPDATE_FIELDS)) {
    return { ok: false, code: "unexpected-fields", fieldErrors: {} };
  }

  const notes = normalizeNotes(formData.get("notes"));
  const fieldErrors: Partial<
    Record<PaymentWriteField, PaymentFieldError>
  > = {};

  if (notes && notes.length > MAX_NOTES_LENGTH) {
    fieldErrors.notes = "too-long";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, code: "invalid-fields", fieldErrors };
  }

  return { ok: true, values: { notes } };
}
