export const LEASE_CREATE_FIELDS = [
  "tenantId",
  "roomId",
  "startDate",
  "endDate",
  "billingDay",
  "monthlyRent",
  "notes",
] as const;

export const LEASE_UPDATE_FIELDS = [
  "startDate",
  "endDate",
  "billingDay",
  "monthlyRent",
  "notes",
] as const;

export type LeaseCreateField = (typeof LEASE_CREATE_FIELDS)[number];
export type LeaseUpdateField = (typeof LEASE_UPDATE_FIELDS)[number];
export type LeaseWriteField = LeaseCreateField;

export type LeaseCreateValues = {
  tenantId: string;
  roomId: string;
  startDate: string;
  endDate: string | null;
  billingDay: number;
  monthlyRent: number;
  notes: string | null;
};

export type LeaseUpdateValues = Omit<
  LeaseCreateValues,
  "tenantId" | "roomId"
>;

export type LeaseFieldError =
  | "required"
  | "invalid-selection"
  | "invalid-date"
  | "invalid-date-range"
  | "invalid-billing-day"
  | "invalid-rent"
  | "too-long";

export type LeaseValidationResult<T> =
  | { ok: true; values: T }
  | {
      ok: false;
      code: "invalid-fields" | "unexpected-fields";
      fieldErrors: Partial<Record<LeaseWriteField, LeaseFieldError>>;
    };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_MONTHLY_RENT = 1_000_000_000;
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

function validateUnexpectedFields(
  formData: FormData,
  allowedFields: readonly string[],
): boolean {
  return [...formData.keys()].some(
    (key) => !key.startsWith("$ACTION_") && !allowedFields.includes(key),
  );
}

function validateTerms(
  formData: FormData,
): LeaseValidationResult<LeaseUpdateValues> {
  const startDate = normalizeSingleLine(formData.get("startDate"));
  const rawEndDate = normalizeSingleLine(formData.get("endDate"));
  const endDate = rawEndDate === "" ? null : rawEndDate;
  const rawBillingDay = normalizeSingleLine(formData.get("billingDay"));
  const rawMonthlyRent = normalizeSingleLine(formData.get("monthlyRent"));
  const billingDay = parsePositiveInteger(rawBillingDay);
  const monthlyRent = parsePositiveInteger(rawMonthlyRent);
  const notes = normalizeNotes(formData.get("notes"));
  const fieldErrors: Partial<
    Record<LeaseWriteField, LeaseFieldError>
  > = {};

  if (startDate === "") {
    fieldErrors.startDate = "required";
  } else if (!isValidDate(startDate)) {
    fieldErrors.startDate = "invalid-date";
  }

  if (endDate && !isValidDate(endDate)) {
    fieldErrors.endDate = "invalid-date";
  } else if (
    endDate &&
    isValidDate(startDate) &&
    endDate <= startDate
  ) {
    fieldErrors.endDate = "invalid-date-range";
  }

  if (billingDay === null || billingDay < 1 || billingDay > 28) {
    fieldErrors.billingDay = "invalid-billing-day";
  }

  if (
    monthlyRent === null ||
    monthlyRent < 1 ||
    monthlyRent > MAX_MONTHLY_RENT
  ) {
    fieldErrors.monthlyRent = "invalid-rent";
  }

  if (notes && notes.length > MAX_NOTES_LENGTH) {
    fieldErrors.notes = "too-long";
  }

  if (
    Object.keys(fieldErrors).length > 0 ||
    billingDay === null ||
    monthlyRent === null
  ) {
    return { ok: false, code: "invalid-fields", fieldErrors };
  }

  return {
    ok: true,
    values: {
      startDate,
      endDate,
      billingDay,
      monthlyRent,
      notes,
    },
  };
}

export function validateLeaseCreateForm(
  formData: FormData,
): LeaseValidationResult<LeaseCreateValues> {
  if (validateUnexpectedFields(formData, LEASE_CREATE_FIELDS)) {
    return {
      ok: false,
      code: "unexpected-fields",
      fieldErrors: {},
    };
  }

  const tenantId = normalizeSingleLine(formData.get("tenantId"));
  const roomId = normalizeSingleLine(formData.get("roomId"));
  const terms = validateTerms(formData);
  const fieldErrors =
    terms.ok ? {} : { ...terms.fieldErrors };

  if (!UUID_PATTERN.test(tenantId)) {
    fieldErrors.tenantId =
      tenantId === "" ? "required" : "invalid-selection";
  }

  if (!UUID_PATTERN.test(roomId)) {
    fieldErrors.roomId = roomId === "" ? "required" : "invalid-selection";
  }

  if (!terms.ok || Object.keys(fieldErrors).length > 0) {
    return { ok: false, code: "invalid-fields", fieldErrors };
  }

  return {
    ok: true,
    values: {
      tenantId,
      roomId,
      ...terms.values,
    },
  };
}

export function validateLeaseUpdateForm(
  formData: FormData,
): LeaseValidationResult<LeaseUpdateValues> {
  if (validateUnexpectedFields(formData, LEASE_UPDATE_FIELDS)) {
    return {
      ok: false,
      code: "unexpected-fields",
      fieldErrors: {},
    };
  }

  return validateTerms(formData);
}
