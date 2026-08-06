export const INVOICE_CREATE_FIELDS = [
  "leaseId",
  "billingPeriod",
  "issueDate",
  "dueDate",
  "amount",
  "notes",
] as const;

export const INVOICE_UPDATE_FIELDS = [
  "issueDate",
  "dueDate",
  "amount",
  "notes",
] as const;

export type InvoiceCreateField = (typeof INVOICE_CREATE_FIELDS)[number];
export type InvoiceUpdateField = (typeof INVOICE_UPDATE_FIELDS)[number];
export type InvoiceWriteField = InvoiceCreateField;

export type InvoiceCreateValues = {
  leaseId: string;
  billingPeriod: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  notes: string | null;
};

export type InvoiceUpdateValues = Omit<
  InvoiceCreateValues,
  "leaseId" | "billingPeriod"
>;

export type InvoiceFieldError =
  | "required"
  | "invalid-selection"
  | "invalid-period"
  | "invalid-date"
  | "invalid-date-range"
  | "invalid-due-date"
  | "invalid-amount"
  | "too-long";

export type InvoiceValidationResult<T> =
  | { ok: true; values: T }
  | {
      ok: false;
      code: "invalid-fields" | "unexpected-fields";
      fieldErrors: Partial<Record<InvoiceWriteField, InvoiceFieldError>>;
    };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const BILLING_PERIOD_PATTERN = /^\d{4}-\d{2}$/;
const MAX_INVOICE_AMOUNT = 1_000_000_000;
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

function isValidBillingPeriod(value: string): boolean {
  if (!BILLING_PERIOD_PATTERN.test(value)) {
    return false;
  }

  const [year, month] = value.split("-").map(Number);
  return year >= 2000 && year <= 2100 && month >= 1 && month <= 12;
}

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function hasUnexpectedFields(
  formData: FormData,
  allowedFields: readonly string[],
): boolean {
  return [...formData.keys()].some(
    (key) => !key.startsWith("$ACTION_") && !allowedFields.includes(key),
  );
}

function validateInvoiceFields(
  formData: FormData,
): InvoiceValidationResult<InvoiceUpdateValues> {
  const issueDate = normalizeSingleLine(formData.get("issueDate"));
  const dueDate = normalizeSingleLine(formData.get("dueDate"));
  const amount = parsePositiveInteger(
    normalizeSingleLine(formData.get("amount")),
  );
  const notes = normalizeNotes(formData.get("notes"));
  const fieldErrors: Partial<
    Record<InvoiceWriteField, InvoiceFieldError>
  > = {};

  if (issueDate === "") {
    fieldErrors.issueDate = "required";
  } else if (!isValidDate(issueDate)) {
    fieldErrors.issueDate = "invalid-date";
  }

  if (dueDate === "") {
    fieldErrors.dueDate = "required";
  } else if (!isValidDate(dueDate)) {
    fieldErrors.dueDate = "invalid-date";
  } else if (isValidDate(issueDate) && dueDate < issueDate) {
    fieldErrors.dueDate = "invalid-date-range";
  }

  if (amount === null || amount < 1 || amount > MAX_INVOICE_AMOUNT) {
    fieldErrors.amount = "invalid-amount";
  }

  if (notes && notes.length > MAX_NOTES_LENGTH) {
    fieldErrors.notes = "too-long";
  }

  if (Object.keys(fieldErrors).length > 0 || amount === null) {
    return { ok: false, code: "invalid-fields", fieldErrors };
  }

  return {
    ok: true,
    values: {
      issueDate,
      dueDate,
      amount,
      notes,
    },
  };
}

export function validateInvoiceCreateForm(
  formData: FormData,
): InvoiceValidationResult<InvoiceCreateValues> {
  if (hasUnexpectedFields(formData, INVOICE_CREATE_FIELDS)) {
    return { ok: false, code: "unexpected-fields", fieldErrors: {} };
  }

  const leaseId = normalizeSingleLine(formData.get("leaseId"));
  const billingPeriod = normalizeSingleLine(formData.get("billingPeriod"));
  const fields = validateInvoiceFields(formData);
  const fieldErrors = fields.ok ? {} : { ...fields.fieldErrors };

  if (!UUID_PATTERN.test(leaseId)) {
    fieldErrors.leaseId =
      leaseId === "" ? "required" : "invalid-selection";
  }

  if (billingPeriod === "") {
    fieldErrors.billingPeriod = "required";
  } else if (!isValidBillingPeriod(billingPeriod)) {
    fieldErrors.billingPeriod = "invalid-period";
  }

  if (!fields.ok || Object.keys(fieldErrors).length > 0) {
    return { ok: false, code: "invalid-fields", fieldErrors };
  }

  return {
    ok: true,
    values: {
      leaseId,
      billingPeriod,
      ...fields.values,
    },
  };
}

export function validateInvoiceUpdateForm(
  formData: FormData,
): InvoiceValidationResult<InvoiceUpdateValues> {
  if (hasUnexpectedFields(formData, INVOICE_UPDATE_FIELDS)) {
    return { ok: false, code: "unexpected-fields", fieldErrors: {} };
  }

  return validateInvoiceFields(formData);
}

export function toBillingPeriodDate(billingPeriod: string): string {
  return `${billingPeriod}-01`;
}

export function deriveInvoiceDueDate(
  billingPeriod: string,
  billingDay: number,
): string {
  return `${billingPeriod}-${billingDay.toString().padStart(2, "0")}`;
}

export function isDateInBillingPeriod(
  date: string,
  billingPeriod: string,
): boolean {
  return date.startsWith(`${billingPeriod}-`);
}
