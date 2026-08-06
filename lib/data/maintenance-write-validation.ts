import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  type MaintenanceCategory,
  type MaintenancePriority,
  type MaintenanceStatus,
} from "./types";

export const MAINTENANCE_WRITE_FIELDS = [
  "roomId",
  "reportedDate",
  "category",
  "title",
  "description",
  "priority",
  "status",
  "vendor",
  "scheduledDate",
  "completedDate",
  "estimatedCost",
  "actualCost",
  "resolution",
  "notes",
] as const;

export type MaintenanceMutationField =
  (typeof MAINTENANCE_WRITE_FIELDS)[number];

export type MaintenanceWriteValues = {
  roomId: string | null;
  reportedDate: string;
  category: MaintenanceCategory;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  vendor: string | null;
  scheduledDate: string | null;
  completedDate: string | null;
  estimatedCost: number | null;
  actualCost: number | null;
  resolution: string | null;
  notes: string | null;
};

export type MaintenanceFieldError =
  | "required"
  | "invalid-selection"
  | "invalid-date"
  | "date-order"
  | "invalid-cost"
  | "too-long"
  | "completion-required"
  | "completion-only"
  | "cancellation-note-required";

export type MaintenanceValidationResult =
  | { ok: true; values: MaintenanceWriteValues }
  | {
      ok: false;
      code: "invalid-fields" | "unexpected-fields";
      fieldErrors: Partial<
        Record<MaintenanceMutationField, MaintenanceFieldError>
      >;
    };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_COST = 1_000_000_000;
const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_VENDOR_LENGTH = 160;
const MAX_RESOLUTION_LENGTH = 2000;
const MAX_NOTES_LENGTH = 2000;

function normalizeSingleLine(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeOptionalSingleLine(
  value: FormDataEntryValue | null,
): string | null {
  const normalized = normalizeSingleLine(value);
  return normalized === "" ? null : normalized;
}

function normalizeMultiline(value: FormDataEntryValue | null): string | null {
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

function parseOptionalCost(value: string): number | null | "invalid" {
  if (value === "") {
    return null;
  }
  if (!/^\d+$/.test(value)) {
    return "invalid";
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= MAX_COST
    ? parsed
    : "invalid";
}

function isCategory(value: string): value is MaintenanceCategory {
  return MAINTENANCE_CATEGORIES.some((candidate) => candidate === value);
}

function isPriority(value: string): value is MaintenancePriority {
  return MAINTENANCE_PRIORITIES.some((candidate) => candidate === value);
}

function isStatus(value: string): value is MaintenanceStatus {
  return MAINTENANCE_STATUSES.some((candidate) => candidate === value);
}

function hasUnexpectedFields(formData: FormData): boolean {
  return [...formData.keys()].some(
    (key) =>
      !key.startsWith("$ACTION_") &&
      !MAINTENANCE_WRITE_FIELDS.includes(
        key as MaintenanceMutationField,
      ),
  );
}

export function validateMaintenanceWriteForm(
  formData: FormData,
  mode: "create" | "update",
): MaintenanceValidationResult {
  if (hasUnexpectedFields(formData)) {
    return { ok: false, code: "unexpected-fields", fieldErrors: {} };
  }

  const rawRoomId = normalizeSingleLine(formData.get("roomId"));
  const roomId = rawRoomId === "" ? null : rawRoomId;
  const reportedDate = normalizeSingleLine(formData.get("reportedDate"));
  const category = normalizeSingleLine(formData.get("category"));
  const title = normalizeSingleLine(formData.get("title"));
  const description = normalizeMultiline(formData.get("description")) ?? "";
  const priority = normalizeSingleLine(formData.get("priority"));
  const status = normalizeSingleLine(formData.get("status"));
  const vendor = normalizeOptionalSingleLine(formData.get("vendor"));
  const scheduledDate =
    normalizeOptionalSingleLine(formData.get("scheduledDate"));
  const completedDate =
    normalizeOptionalSingleLine(formData.get("completedDate"));
  const estimatedCost = parseOptionalCost(
    normalizeSingleLine(formData.get("estimatedCost")),
  );
  const actualCost = parseOptionalCost(
    normalizeSingleLine(formData.get("actualCost")),
  );
  const resolution = normalizeMultiline(formData.get("resolution"));
  const notes = normalizeMultiline(formData.get("notes"));
  const fieldErrors: Partial<
    Record<MaintenanceMutationField, MaintenanceFieldError>
  > = {};

  if (roomId !== null && !UUID_PATTERN.test(roomId)) {
    fieldErrors.roomId = "invalid-selection";
  }
  if (reportedDate === "") {
    fieldErrors.reportedDate = "required";
  } else if (!isValidDate(reportedDate)) {
    fieldErrors.reportedDate = "invalid-date";
  }
  if (!isCategory(category)) {
    fieldErrors.category =
      category === "" ? "required" : "invalid-selection";
  }
  if (title === "") {
    fieldErrors.title = "required";
  } else if (title.length > MAX_TITLE_LENGTH) {
    fieldErrors.title = "too-long";
  }
  if (description === "") {
    fieldErrors.description = "required";
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    fieldErrors.description = "too-long";
  }
  if (!isPriority(priority)) {
    fieldErrors.priority =
      priority === "" ? "required" : "invalid-selection";
  }
  if (!isStatus(status) || (mode === "create" && status !== "open")) {
    fieldErrors.status =
      status === "" ? "required" : "invalid-selection";
  }
  if (vendor && vendor.length > MAX_VENDOR_LENGTH) {
    fieldErrors.vendor = "too-long";
  }
  if (scheduledDate && !isValidDate(scheduledDate)) {
    fieldErrors.scheduledDate = "invalid-date";
  }
  if (completedDate && !isValidDate(completedDate)) {
    fieldErrors.completedDate = "invalid-date";
  }
  if (
    isValidDate(reportedDate) &&
    scheduledDate &&
    isValidDate(scheduledDate) &&
    scheduledDate < reportedDate
  ) {
    fieldErrors.scheduledDate = "date-order";
  }
  if (
    isValidDate(reportedDate) &&
    completedDate &&
    isValidDate(completedDate) &&
    completedDate < reportedDate
  ) {
    fieldErrors.completedDate = "date-order";
  }
  if (
    scheduledDate &&
    completedDate &&
    isValidDate(scheduledDate) &&
    isValidDate(completedDate) &&
    completedDate < scheduledDate
  ) {
    fieldErrors.completedDate = "date-order";
  }
  if (estimatedCost === "invalid") {
    fieldErrors.estimatedCost = "invalid-cost";
  }
  if (actualCost === "invalid") {
    fieldErrors.actualCost = "invalid-cost";
  }
  if (resolution && resolution.length > MAX_RESOLUTION_LENGTH) {
    fieldErrors.resolution = "too-long";
  }
  if (notes && notes.length > MAX_NOTES_LENGTH) {
    fieldErrors.notes = "too-long";
  }

  if (status === "completed") {
    if (!completedDate) {
      fieldErrors.completedDate = "completion-required";
    }
  } else if (completedDate || actualCost !== null || resolution) {
    if (completedDate) fieldErrors.completedDate = "completion-only";
    if (actualCost !== null) fieldErrors.actualCost = "completion-only";
    if (resolution) fieldErrors.resolution = "completion-only";
  }

  if (status === "cancelled" && !notes) {
    fieldErrors.notes = "cancellation-note-required";
  }

  if (
    Object.keys(fieldErrors).length > 0 ||
    !isCategory(category) ||
    !isPriority(priority) ||
    !isStatus(status) ||
    estimatedCost === "invalid" ||
    actualCost === "invalid"
  ) {
    return { ok: false, code: "invalid-fields", fieldErrors };
  }

  return {
    ok: true,
    values: {
      roomId,
      reportedDate,
      category,
      title,
      description,
      priority,
      status,
      vendor,
      scheduledDate,
      completedDate,
      estimatedCost,
      actualCost,
      resolution,
      notes,
    },
  };
}
