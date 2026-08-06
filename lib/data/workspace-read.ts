import "server-only";

import { cache } from "react";
import { getPropertyAccess } from "@/lib/auth/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEMO_NEXT_BILLING_PERIOD } from "./presentation";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  INVOICE_STATUSES,
  LEASE_STATUSES,
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  ROOM_STATUSES,
  TENANT_STATUSES,
  type DatabaseRoomStatus,
  type Expense,
  type ExpenseCategory,
  type ExpenseStatus,
  type Invoice,
  type InvoiceStatus,
  type Lease,
  type LeaseStatus,
  type MaintenanceCategory,
  type MaintenancePriority,
  type MaintenanceRecord,
  type MaintenanceStatus,
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
  type PropertyRecord,
  type Room,
  type RoomLocation,
  type RoomStatus,
  type Tenant,
  type TenantStatus,
} from "./types";

export class WorkspaceDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceDataError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(
  row: Record<string, unknown>,
  field: string,
  context: string,
): string {
  const value = row[field];

  if (typeof value !== "string") {
    throw new WorkspaceDataError(`${context} has an invalid ${field}.`);
  }

  return value;
}

function readNullableString(
  row: Record<string, unknown>,
  field: string,
  context: string,
): string | null {
  const value = row[field];

  if (value !== null && typeof value !== "string") {
    throw new WorkspaceDataError(`${context} has an invalid ${field}.`);
  }

  return value;
}

function readNumber(
  row: Record<string, unknown>,
  field: string,
  context: string,
): number {
  const value = row[field];
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isSafeInteger(numberValue)) {
    throw new WorkspaceDataError(`${context} has an invalid ${field}.`);
  }

  return numberValue;
}

function readNullableNumber(
  row: Record<string, unknown>,
  field: string,
  context: string,
): number | null {
  return row[field] === null ? null : readNumber(row, field, context);
}

function readUnion<TValue extends string>(
  row: Record<string, unknown>,
  field: string,
  values: readonly TValue[],
  context: string,
): TValue {
  const value = row[field];

  if (
    typeof value !== "string" ||
    !values.some((candidate) => candidate === value)
  ) {
    throw new WorkspaceDataError(`${context} has an invalid ${field}.`);
  }

  const matched = values.find((candidate) => candidate === value);

  if (!matched) {
    throw new WorkspaceDataError(`${context} has an invalid ${field}.`);
  }

  return matched;
}

function readRows(value: unknown, context: string): Record<string, unknown>[] {
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new WorkspaceDataError(`${context} returned an invalid result.`);
  }

  return value;
}

function readRoomLocation(value: string, context: string): RoomLocation {
  if (value !== "South Wing" && value !== "North Wing") {
    throw new WorkspaceDataError(`${context} has an invalid location.`);
  }

  return value;
}

function toRoomStatus(status: DatabaseRoomStatus): RoomStatus {
  if (status === "occupied") return "Occupied";
  if (status === "available") return "Available";
  return "Maintenance";
}

function parseProperty(value: unknown): PropertyRecord {
  if (!isRecord(value)) {
    throw new WorkspaceDataError("Property query returned an invalid result.");
  }

  return {
    id: readString(value, "id", "Property"),
    name: readString(value, "name", "Property"),
    timezone: readString(value, "timezone", "Property"),
    currencyCode: readString(value, "currency_code", "Property"),
  };
}

type RoomBase = {
  id: string;
  roomNumber: string;
  location: RoomLocation;
  floor: 1 | 2 | null;
  monthlyRate: number;
  status: RoomStatus;
};

function parseRoomBases(value: unknown): RoomBase[] {
  return readRows(value, "Rooms").map((row, index) => {
    const context = `Room row ${index + 1}`;
    const floor = readNullableNumber(row, "floor", context);

    if (floor !== null && floor !== 1 && floor !== 2) {
      throw new WorkspaceDataError(`${context} has an invalid floor.`);
    }

    return {
      id: readString(row, "id", context),
      roomNumber: readString(row, "room_number", context),
      location: readRoomLocation(
        readString(row, "location", context),
        context,
      ),
      floor,
      monthlyRate: readNumber(row, "monthly_rate", context),
      status: toRoomStatus(
        readUnion(row, "status", ROOM_STATUSES, context),
      ),
    };
  });
}

type TenantBase = Omit<Tenant, "currentRoomId">;

function parseTenantBases(value: unknown): TenantBase[] {
  return readRows(value, "Tenants").map((row, index) => {
    const context = `Tenant row ${index + 1}`;

    return {
      id: readString(row, "id", context),
      fullName: readString(row, "full_name", context),
      preferredName: readNullableString(row, "preferred_name", context),
      phone: readNullableString(row, "phone", context) ?? "",
      email: readNullableString(row, "email", context),
      emergencyContactName:
        readNullableString(row, "emergency_contact_name", context) ?? "",
      emergencyContactPhone:
        readNullableString(row, "emergency_contact_phone", context) ?? "",
      occupation: readNullableString(row, "occupation", context),
      companyOrInstitution: readNullableString(
        row,
        "company_or_institution",
        context,
      ),
      tenantStatus: readUnion<TenantStatus>(
        row,
        "status",
        TENANT_STATUSES,
        context,
      ),
      notes: readNullableString(row, "notes", context) ?? "",
    };
  });
}

function parseLeases(value: unknown): Lease[] {
  return readRows(value, "Leases").map((row, index) => {
    const context = `Lease row ${index + 1}`;

    return {
      id: readString(row, "id", context),
      reference: `EH-LSE-${(index + 1).toString().padStart(3, "0")}`,
      tenantId: readString(row, "tenant_id", context),
      roomId: readString(row, "room_id", context),
      status: readUnion<LeaseStatus>(
        row,
        "status",
        LEASE_STATUSES,
        context,
      ),
      startDate: readString(row, "start_date", context),
      endDate: readNullableString(row, "end_date", context) ?? "",
      monthlyRent: readNumber(row, "monthly_rent", context),
      billingDay: readNumber(row, "billing_day", context),
      depositAmount: readNullableNumber(row, "deposit_amount", context),
      notes: readNullableString(row, "notes", context) ?? "",
    };
  });
}

function parsePayments(value: unknown): Payment[] {
  return readRows(value, "Payments").map((row, index) => {
    const context = `Payment row ${index + 1}`;

    return {
      id: readString(row, "id", context),
      invoiceId: readString(row, "invoice_id", context),
      amount: readNumber(row, "amount", context),
      paymentDate: readString(row, "payment_date", context),
      method: readUnion<PaymentMethod>(
        row,
        "method",
        PAYMENT_METHODS,
        context,
      ),
      reference: readString(row, "reference", context),
      status: readUnion<PaymentStatus>(
        row,
        "status",
        PAYMENT_STATUSES,
        context,
      ),
      notes: readNullableString(row, "notes", context) ?? "",
    };
  });
}

function parseInvoices(value: unknown, payments: readonly Payment[]): Invoice[] {
  return readRows(value, "Invoices").map((row, index) => {
    const context = `Invoice row ${index + 1}`;
    const id = readString(row, "id", context);
    const amount = readNumber(row, "amount", context);
    const paidAmount = payments
      .filter(
        (payment) =>
          payment.invoiceId === id && payment.status === "completed",
      )
      .reduce((total, payment) => total + payment.amount, 0);

    return {
      id,
      reference: readString(row, "reference", context),
      leaseId: readString(row, "lease_id", context),
      billingPeriod: readString(row, "billing_period", context).slice(0, 7),
      issueDate: readString(row, "issue_date", context),
      dueDate: readString(row, "due_date", context),
      amount,
      paidAmount,
      balance: amount - paidAmount,
      status: readUnion<InvoiceStatus>(
        row,
        "status",
        INVOICE_STATUSES,
        context,
      ),
      notes: readNullableString(row, "notes", context) ?? "",
    };
  });
}

function parseExpenses(value: unknown): Expense[] {
  return readRows(value, "Expenses").map((row, index) => {
    const context = `Expense row ${index + 1}`;

    return {
      id: readString(row, "id", context),
      reference: readString(row, "reference", context),
      expenseDate: readString(row, "expense_date", context),
      category: readUnion<ExpenseCategory>(
        row,
        "category",
        EXPENSE_CATEGORIES,
        context,
      ),
      description: readString(row, "description", context),
      amount: readNumber(row, "amount", context),
      paymentMethod: readUnion<PaymentMethod>(
        row,
        "payment_method",
        PAYMENT_METHODS,
        context,
      ),
      vendor: readNullableString(row, "vendor", context) ?? "",
      roomId: readNullableString(row, "room_id", context),
      status: readUnion<ExpenseStatus>(
        row,
        "status",
        EXPENSE_STATUSES,
        context,
      ),
      notes: readNullableString(row, "notes", context) ?? "",
      voidReason: readNullableString(row, "void_reason", context),
      voidedAt: readNullableString(row, "voided_at", context),
    };
  });
}

function parseMaintenance(value: unknown): MaintenanceRecord[] {
  return readRows(value, "Maintenance").map((row, index) => {
    const context = `Maintenance row ${index + 1}`;

    return {
      id: readString(row, "id", context),
      reference: readString(row, "reference", context),
      reportedDate: readString(row, "reported_date", context),
      category: readUnion<MaintenanceCategory>(
        row,
        "category",
        MAINTENANCE_CATEGORIES,
        context,
      ),
      title: readString(row, "title", context),
      description: readString(row, "description", context),
      priority: readUnion<MaintenancePriority>(
        row,
        "priority",
        MAINTENANCE_PRIORITIES,
        context,
      ),
      status: readUnion<MaintenanceStatus>(
        row,
        "status",
        MAINTENANCE_STATUSES,
        context,
      ),
      roomId: readNullableString(row, "room_id", context),
      vendor: readNullableString(row, "vendor", context),
      scheduledDate: readNullableString(row, "scheduled_date", context),
      completedDate: readNullableString(row, "completed_date", context),
      estimatedCost: readNullableNumber(row, "estimated_cost", context),
      actualCost: readNullableNumber(row, "actual_cost", context),
      resolution: readNullableString(row, "resolution", context),
      notes: readNullableString(row, "notes", context),
    };
  });
}

function requireQuerySuccess(
  error: { message: string } | null,
  domain: string,
): void {
  if (error) {
    throw new WorkspaceDataError(
      `Unable to load ${domain} from the property database.`,
    );
  }
}

async function loadWorkspaceData() {
  const access = await getPropertyAccess();

  if (access.status !== "authorized") {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const propertyId = access.property.id;
  const [
    propertyResult,
    roomResult,
    tenantResult,
    leaseResult,
    invoiceResult,
    paymentResult,
    expenseResult,
    maintenanceResult,
  ] = await Promise.all([
    supabase
      .from("properties")
      .select("id, name, timezone, currency_code")
      .eq("id", propertyId)
      .single(),
    supabase
      .from("rooms")
      .select("id, room_number, location, floor, monthly_rate, status")
      .eq("property_id", propertyId)
      .order("sort_order"),
    supabase
      .from("tenants")
      .select(
        "id, full_name, preferred_name, phone, email, emergency_contact_name, emergency_contact_phone, occupation, company_or_institution, status, notes",
      )
      .eq("property_id", propertyId)
      .order("created_at"),
    supabase
      .from("leases")
      .select(
        "id, tenant_id, room_id, status, start_date, end_date, monthly_rent, billing_day, deposit_amount, notes",
      )
      .eq("property_id", propertyId)
      .order("start_date"),
    supabase
      .from("invoices")
      .select(
        "id, lease_id, reference, billing_period, issue_date, due_date, amount, status, notes",
      )
      .eq("property_id", propertyId)
      .order("reference"),
    supabase
      .from("payments")
      .select(
        "id, invoice_id, reference, amount, payment_date, method, status, notes",
      )
      .eq("property_id", propertyId)
      .order("reference"),
    supabase
      .from("expenses")
      .select(
        "id, room_id, reference, expense_date, category, description, amount, payment_method, vendor, status, notes, void_reason, voided_at",
      )
      .eq("property_id", propertyId)
      .order("reference"),
    supabase
      .from("maintenance_records")
      .select(
        "id, room_id, reference, reported_date, category, title, description, priority, status, vendor, scheduled_date, completed_date, estimated_cost, actual_cost, resolution, notes",
      )
      .eq("property_id", propertyId)
      .order("reference"),
  ]);

  requireQuerySuccess(propertyResult.error, "property configuration");
  requireQuerySuccess(roomResult.error, "rooms");
  requireQuerySuccess(tenantResult.error, "tenants");
  requireQuerySuccess(leaseResult.error, "leases");
  requireQuerySuccess(invoiceResult.error, "invoices");
  requireQuerySuccess(paymentResult.error, "payments");
  requireQuerySuccess(expenseResult.error, "expenses");
  requireQuerySuccess(maintenanceResult.error, "maintenance records");

  const property = parseProperty(propertyResult.data as unknown);
  const roomBases = parseRoomBases(roomResult.data as unknown);
  const tenantBases = parseTenantBases(tenantResult.data as unknown);
  const leases = parseLeases(leaseResult.data as unknown);
  const payments = parsePayments(paymentResult.data as unknown);
  const invoices = parseInvoices(invoiceResult.data as unknown, payments);
  const expenses = parseExpenses(expenseResult.data as unknown);
  const maintenanceRecords = parseMaintenance(
    maintenanceResult.data as unknown,
  );
  const activeLeaseByRoom = new Map(
    leases
      .filter((lease) => lease.status === "active")
      .map((lease) => [lease.roomId, lease]),
  );
  const tenantBaseById = new Map(
    tenantBases.map((tenant) => [tenant.id, tenant]),
  );
  const rooms: Room[] = roomBases.map((room) => {
    const lease = activeLeaseByRoom.get(room.id);
    const tenant = lease ? tenantBaseById.get(lease.tenantId) : null;

    if (room.status === "Occupied" && (!lease || !tenant)) {
      throw new WorkspaceDataError(
        `Occupied Room ${room.roomNumber} has no active tenant lease.`,
      );
    }

    if (room.status === "Available") {
      return {
        ...room,
        status: "Available",
        operationalNote: "Vacant and ready for occupancy.",
        tenantName: null,
        occupancyStartDate: null,
        nextDueDate: null,
        maintenanceNote: null,
      };
    }

    if (room.status === "Maintenance") {
      return {
        ...room,
        status: "Maintenance",
        operationalNote: "Unavailable while maintenance status is active.",
        tenantName: null,
        occupancyStartDate: null,
        nextDueDate: null,
        maintenanceNote: "Maintenance status is active.",
      };
    }

    if (!lease || !tenant) {
      throw new WorkspaceDataError(
        `Occupied Room ${room.roomNumber} has no active tenant lease.`,
      );
    }

    return {
      ...room,
      status: "Occupied",
      operationalNote:
        "Occupied; tenant identity and occupancy dates are fictional demo data.",
      tenantName: tenant.fullName,
      occupancyStartDate: lease.startDate,
      nextDueDate: `${DEMO_NEXT_BILLING_PERIOD}-${lease.billingDay
        .toString()
        .padStart(2, "0")}`,
      maintenanceNote: null,
    };
  });
  const activeLeaseByTenant = new Map(
    leases
      .filter((lease) => lease.status === "active")
      .map((lease) => [lease.tenantId, lease]),
  );
  const tenants: Tenant[] = tenantBases.map((tenant) => {
    const lease = activeLeaseByTenant.get(tenant.id);

    if (tenant.tenantStatus === "active" && !lease) {
      throw new WorkspaceDataError(
        `Active tenant ${tenant.id} has no active lease.`,
      );
    }

    return {
      ...tenant,
      currentRoomId: lease?.roomId ?? "",
    };
  });

  return {
    property,
    rooms,
    tenants,
    leases,
    invoices,
    payments,
    expenses,
    maintenanceRecords,
  };
}

export const getWorkspaceData = cache(loadWorkspaceData);
export type WorkspaceData = NonNullable<
  Awaited<ReturnType<typeof loadWorkspaceData>>
>;
