export const ROOM_STATUSES = ["occupied", "available", "maintenance"] as const;
export type DatabaseRoomStatus = (typeof ROOM_STATUSES)[number];
export type RoomStatus = "Occupied" | "Available" | "Maintenance";
export type RoomLocation = "North Wing" | "South Wing";

type BaseRoom = {
  id: string;
  roomNumber: string;
  location: RoomLocation;
  floor: 1 | 2 | null;
  monthlyRate: number;
  operationalNote: string;
};

export type Room =
  | (BaseRoom & {
      status: "Occupied";
      tenantName: string;
      occupancyStartDate: string;
      nextDueDate: string;
      maintenanceNote: null;
    })
  | (BaseRoom & {
      status: "Available";
      tenantName: null;
      occupancyStartDate: null;
      nextDueDate: null;
      maintenanceNote: null;
    })
  | (BaseRoom & {
      status: "Maintenance";
      tenantName: null;
      occupancyStartDate: null;
      nextDueDate: null;
      maintenanceNote: string;
    });

export const TENANT_STATUSES = ["active", "former", "pending"] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export type Tenant = {
  id: string;
  fullName: string;
  preferredName: string | null;
  phone: string;
  email: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  occupation: string | null;
  companyOrInstitution: string | null;
  tenantStatus: TenantStatus;
  currentRoomId: string;
  notes: string;
};

export const LEASE_STATUSES = ["active", "upcoming", "ended"] as const;
export type LeaseStatus = (typeof LEASE_STATUSES)[number];

export type Lease = {
  id: string;
  reference: string;
  tenantId: string;
  roomId: string;
  status: LeaseStatus;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  billingDay: number;
  depositAmount: number | null;
  notes: string;
};

export const INVOICE_STATUSES = [
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "overdue",
  "void",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type Invoice = {
  id: string;
  reference: string;
  leaseId: string;
  billingPeriod: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: InvoiceStatus;
  notes: string;
};

export const PAYMENT_METHODS = [
  "bank_transfer",
  "cash",
  "e_wallet",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_STATUSES = ["completed", "pending", "reversed"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type Payment = {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference: string;
  status: PaymentStatus;
  notes: string;
};

export const EXPENSE_CATEGORIES = [
  "utilities",
  "maintenance",
  "internet",
  "cleaning",
  "supplies",
  "payroll",
  "security",
  "taxes_fees",
  "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export const EXPENSE_STATUSES = ["recorded", "pending", "void"] as const;
export const expenseCategories = EXPENSE_CATEGORIES;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];
export type ExpensePaymentMethod = PaymentMethod;

export type Expense = {
  id: string;
  reference: string;
  expenseDate: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  vendor: string;
  roomId: string | null;
  status: ExpenseStatus;
  notes: string;
  voidReason: string | null;
  voidedAt: string | null;
};

export const MAINTENANCE_STATUSES = [
  "open",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];
export const MAINTENANCE_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
] as const;
export type MaintenancePriority = (typeof MAINTENANCE_PRIORITIES)[number];
export const MAINTENANCE_CATEGORIES = [
  "plumbing",
  "electrical",
  "ac",
  "furniture",
  "appliance",
  "internet",
  "building",
  "cleaning",
  "other",
] as const;
export const maintenanceCategories = MAINTENANCE_CATEGORIES;
export const maintenancePriorities = MAINTENANCE_PRIORITIES;
export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number];

export type MaintenanceRecord = {
  id: string;
  reference: string;
  reportedDate: string;
  category: MaintenanceCategory;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  roomId: string | null;
  vendor: string | null;
  scheduledDate: string | null;
  completedDate: string | null;
  estimatedCost: number | null;
  actualCost: number | null;
  resolution: string | null;
  notes: string | null;
};

export type PropertyRecord = {
  id: string;
  name: string;
  timezone: string;
  currencyCode: string;
};

export type RoomOccupancySummary = {
  total: number;
  occupied: number;
  available: number;
  maintenance: number;
  occupancyRate: number;
};

export type ExpenseSummary = {
  totalAmount: number;
  recordedAmount: number;
  pendingAmount: number;
  recordedCount: number;
  pendingCount: number;
  voidCount: number;
  propertyWideCount: number;
  roomSpecificCount: number;
};

export type MaintenanceSummary = {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  urgent: number;
  roomSpecific: number;
  propertyWide: number;
};
