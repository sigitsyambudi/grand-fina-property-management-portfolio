export const TENANT_WRITE_FIELDS = [
  "fullName",
  "preferredName",
  "phone",
  "email",
  "occupation",
  "companyOrInstitution",
  "emergencyContactName",
  "emergencyContactPhone",
  "notes",
] as const;

export type TenantWriteField = (typeof TENANT_WRITE_FIELDS)[number];

export type TenantWriteValues = {
  fullName: string;
  preferredName: string | null;
  phone: string | null;
  email: string | null;
  occupation: string | null;
  companyOrInstitution: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
};

export type TenantFieldError =
  | "required"
  | "too-long"
  | "invalid-email"
  | "invalid-phone"
  | "emergency-contact-incomplete";

export type TenantValidationResult =
  | { ok: true; values: TenantWriteValues }
  | {
      ok: false;
      code: "invalid-fields" | "unexpected-fields";
      fieldErrors: Partial<Record<TenantWriteField, TenantFieldError>>;
    };

const FIELD_LIMITS = {
  fullName: 120,
  preferredName: 80,
  phone: 40,
  email: 254,
  occupation: 120,
  companyOrInstitution: 160,
  emergencyContactName: 120,
  emergencyContactPhone: 40,
  notes: 1000,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+().\-\s]+$/;

function isTenantWriteField(value: string): value is TenantWriteField {
  return TENANT_WRITE_FIELDS.some((field) => field === value);
}

function normalizeSingleLine(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized === "" ? null : normalized;
}

function normalizeNotes(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

function validateLength(
  field: TenantWriteField,
  value: string | null,
  fieldErrors: Partial<Record<TenantWriteField, TenantFieldError>>,
): void {
  if (value && value.length > FIELD_LIMITS[field]) {
    fieldErrors[field] = "too-long";
  }
}

export function validateTenantForm(formData: FormData): TenantValidationResult {
  const unexpectedField = [...formData.keys()].find(
    (key) => !key.startsWith("$ACTION_") && !isTenantWriteField(key),
  );

  if (unexpectedField) {
    return {
      ok: false,
      code: "unexpected-fields",
      fieldErrors: {},
    };
  }

  const values: TenantWriteValues = {
    fullName: normalizeSingleLine(formData.get("fullName")) ?? "",
    preferredName: normalizeSingleLine(formData.get("preferredName")),
    phone: normalizeSingleLine(formData.get("phone")),
    email: normalizeSingleLine(formData.get("email"))?.toLowerCase() ?? null,
    occupation: normalizeSingleLine(formData.get("occupation")),
    companyOrInstitution: normalizeSingleLine(
      formData.get("companyOrInstitution"),
    ),
    emergencyContactName: normalizeSingleLine(
      formData.get("emergencyContactName"),
    ),
    emergencyContactPhone: normalizeSingleLine(
      formData.get("emergencyContactPhone"),
    ),
    notes: normalizeNotes(formData.get("notes")),
  };
  const fieldErrors: Partial<Record<TenantWriteField, TenantFieldError>> = {};

  if (values.fullName === "") {
    fieldErrors.fullName = "required";
  }

  for (const field of TENANT_WRITE_FIELDS) {
    validateLength(field, values[field], fieldErrors);
  }

  if (values.email && !EMAIL_PATTERN.test(values.email)) {
    fieldErrors.email = "invalid-email";
  }

  for (const field of ["phone", "emergencyContactPhone"] as const) {
    const phone = values[field];
    if (phone && !PHONE_PATTERN.test(phone)) {
      fieldErrors[field] = "invalid-phone";
    }
  }

  if (
    Boolean(values.emergencyContactName) !==
    Boolean(values.emergencyContactPhone)
  ) {
    fieldErrors.emergencyContactName = "emergency-contact-incomplete";
    fieldErrors.emergencyContactPhone = "emergency-contact-incomplete";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, code: "invalid-fields", fieldErrors };
  }

  return { ok: true, values };
}
