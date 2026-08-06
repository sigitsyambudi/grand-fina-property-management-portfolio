import {
  EXPENSE_CATEGORIES,
  MAINTENANCE_CATEGORIES,
  PAYMENT_METHODS,
  type InvoiceStatus,
  type RoomLocation,
} from "./types";
import type { WorkspaceData } from "./workspace-read";
import {
  DEMO_BILLING_PERIOD,
} from "./presentation";

const REPORTING_PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function isReportableInvoice(status: InvoiceStatus): boolean {
  return status !== "draft" && status !== "void";
}

function isDateInReportingPeriod(date: string, period: string): boolean {
  return date.startsWith(period);
}

export function getReportingPeriods(data: WorkspaceData): readonly string[] {
  const periods = new Set<string>();

  for (const invoice of data.invoices) {
    periods.add(invoice.billingPeriod);
  }

  for (const payment of data.payments) {
    periods.add(payment.paymentDate.slice(0, 7));
  }

  for (const expense of data.expenses) {
    periods.add(expense.expenseDate.slice(0, 7));
  }

  return [...periods]
    .filter((period) => REPORTING_PERIOD_PATTERN.test(period))
    .sort((left, right) => right.localeCompare(left));
}

export function resolveReportingPeriod(
  data: WorkspaceData,
  requestedPeriod?: string,
): {
  selectedPeriod: string;
  availablePeriods: readonly string[];
} {
  const availablePeriods = getReportingPeriods(data);
  const selectedPeriod =
    requestedPeriod &&
    REPORTING_PERIOD_PATTERN.test(requestedPeriod) &&
    availablePeriods.includes(requestedPeriod)
      ? requestedPeriod
      : availablePeriods[0] ?? new Date().toISOString().slice(0, 7);

  return { selectedPeriod, availablePeriods };
}

export function getCurrentDateInTimeZone(
  timeZone: string,
  now = new Date(),
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

export function deriveOccupancy(data: WorkspaceData) {
  const occupied = data.rooms.filter(
    (room) => room.status === "Occupied",
  ).length;
  const available = data.rooms.filter(
    (room) => room.status === "Available",
  ).length;
  const maintenance = data.rooms.filter(
    (room) => room.status === "Maintenance",
  ).length;

  return {
    total: data.rooms.length,
    occupied,
    available,
    maintenance,
    occupancyRate:
      data.rooms.length === 0 ? 0 : (occupied / data.rooms.length) * 100,
  };
}

export function deriveExpenseSummary(data: WorkspaceData) {
  const recorded = data.expenses.filter(
    (expense) => expense.status === "recorded",
  );
  const pending = data.expenses.filter(
    (expense) => expense.status === "pending",
  );

  return {
    totalAmount: data.expenses
      .filter((expense) => expense.status !== "void")
      .reduce((total, expense) => total + expense.amount, 0),
    recordedAmount: recorded.reduce(
      (total, expense) => total + expense.amount,
      0,
    ),
    pendingAmount: pending.reduce(
      (total, expense) => total + expense.amount,
      0,
    ),
    recordedCount: recorded.length,
    pendingCount: pending.length,
    voidCount: data.expenses.filter((expense) => expense.status === "void")
      .length,
    propertyWideCount: data.expenses.filter(
      (expense) => expense.roomId === null,
    ).length,
    roomSpecificCount: data.expenses.filter(
      (expense) => expense.roomId !== null,
    ).length,
  };
}

export function deriveMaintenanceSummary(data: WorkspaceData) {
  return {
    total: data.maintenanceRecords.length,
    open: data.maintenanceRecords.filter((record) => record.status === "open")
      .length,
    inProgress: data.maintenanceRecords.filter(
      (record) => record.status === "in_progress",
    ).length,
    completed: data.maintenanceRecords.filter(
      (record) => record.status === "completed",
    ).length,
    cancelled: data.maintenanceRecords.filter(
      (record) => record.status === "cancelled",
    ).length,
    urgent: data.maintenanceRecords.filter(
      (record) =>
        record.priority === "urgent" &&
        record.status !== "completed" &&
        record.status !== "cancelled",
    ).length,
    roomSpecific: data.maintenanceRecords.filter(
      (record) => record.roomId !== null,
    ).length,
    propertyWide: data.maintenanceRecords.filter(
      (record) => record.roomId === null,
    ).length,
  };
}

export function deriveInvoiceSummary(data: WorkspaceData) {
  return {
    total: data.invoices.length,
    totalBilled: data.invoices.reduce(
      (total, invoice) => total + invoice.amount,
      0,
    ),
    totalPaid: data.invoices.reduce(
      (total, invoice) => total + invoice.paidAmount,
      0,
    ),
    outstandingBalance: data.invoices.reduce(
      (total, invoice) => total + invoice.balance,
      0,
    ),
    paid: data.invoices.filter((invoice) => invoice.status === "paid").length,
    issued: data.invoices.filter((invoice) => invoice.status === "issued")
      .length,
    partiallyPaid: data.invoices.filter(
      (invoice) => invoice.status === "partially_paid",
    ).length,
    overdue: data.invoices.filter((invoice) => invoice.status === "overdue")
      .length,
  };
}

export function derivePaymentSummary(data: WorkspaceData) {
  return {
    total: data.payments.length,
    completed: data.payments.filter(
      (payment) => payment.status === "completed",
    ).length,
    pending: data.payments.filter((payment) => payment.status === "pending")
      .length,
    reversed: data.payments.filter((payment) => payment.status === "reversed")
      .length,
    totalReceived: data.payments
      .filter((payment) => payment.status === "completed")
      .reduce((total, payment) => total + payment.amount, 0),
  };
}

export function deriveDashboard(
  data: WorkspaceData,
  reportingPeriod: string,
  referenceDate: string,
) {
  const occupancy = deriveOccupancy(data);
  const periodInvoices = data.invoices.filter(
    (invoice) =>
      invoice.billingPeriod === reportingPeriod &&
      isReportableInvoice(invoice.status),
  );
  const periodPayments = data.payments.filter(
    (payment) =>
      payment.status === "completed" &&
      isDateInReportingPeriod(payment.paymentDate, reportingPeriod),
  );
  const periodRecordedExpenses = data.expenses.filter(
    (expense) =>
      expense.status === "recorded" &&
      isDateInReportingPeriod(expense.expenseDate, reportingPeriod),
  );
  const leaseById = new Map(data.leases.map((lease) => [lease.id, lease]));
  const tenantById = new Map(
    data.tenants.map((tenant) => [tenant.id, tenant]),
  );
  const roomById = new Map(data.rooms.map((room) => [room.id, room]));
  const invoiceById = new Map(
    data.invoices.map((invoice) => [invoice.id, invoice]),
  );
  const totalBilled = periodInvoices.reduce(
    (total, invoice) => total + invoice.amount,
    0,
  );
  const totalReceived = periodPayments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  const outstandingBalance = periodInvoices.reduce(
    (total, invoice) => total + invoice.balance,
    0,
  );
  const recordedExpenseAmount = periodRecordedExpenses.reduce(
    (total, expense) => total + expense.amount,
    0,
  );
  const dueDates = new Map<
    string,
    {
      dueDate: string;
      invoiceCount: number;
      balance: number;
      issuedCount: number;
      partiallyPaidCount: number;
    }
  >();

  for (const invoice of periodInvoices) {
    if (invoice.balance <= 0 || invoice.dueDate < referenceDate) {
      continue;
    }

    const current = dueDates.get(invoice.dueDate) ?? {
      dueDate: invoice.dueDate,
      invoiceCount: 0,
      balance: 0,
      issuedCount: 0,
      partiallyPaidCount: 0,
    };
    dueDates.set(invoice.dueDate, {
      dueDate: invoice.dueDate,
      invoiceCount: current.invoiceCount + 1,
      balance: current.balance + invoice.balance,
      issuedCount: current.issuedCount + Number(invoice.status === "issued"),
      partiallyPaidCount:
        current.partiallyPaidCount +
        Number(invoice.status === "partially_paid"),
    });
  }

  const recentPayments = [...periodPayments]
    .sort(
      (left, right) =>
        right.paymentDate.localeCompare(left.paymentDate) ||
        right.reference.localeCompare(left.reference),
    )
    .slice(0, 5)
    .map((payment) => {
      const invoice = invoiceById.get(payment.invoiceId);
      const lease = invoice ? leaseById.get(invoice.leaseId) : null;
      const tenant = lease ? tenantById.get(lease.tenantId) : null;
      const room = lease ? roomById.get(lease.roomId) : null;

      if (!invoice || !lease || !tenant || !room) {
        throw new Error(
          `Invalid payment relationship for ${payment.reference}.`,
        );
      }

      return {
        id: payment.id,
        reference: payment.reference,
        roomNumber: room.roomNumber,
        tenantName: tenant.fullName,
        paymentDate: payment.paymentDate,
        amount: payment.amount,
        method: payment.method,
      };
    });

  return {
    summary: {
      occupancy,
      availableRoomNumbers: data.rooms
        .filter((room) => room.status === "Available")
        .map((room) => room.roomNumber),
      fullPropertyMonthlyPotential: data.rooms.reduce(
        (total, room) => total + room.monthlyRate,
        0,
      ),
      activeLeaseMonthlyValue: data.leases
        .filter((lease) => lease.status === "active")
        .reduce((total, lease) => total + lease.monthlyRent, 0),
      billingPeriod: reportingPeriod,
      referenceDate,
      totalInvoices: periodInvoices.length,
      totalBilled,
      totalReceived,
      outstandingBalance,
      recordedExpenseAmount,
      netCashFlow: totalReceived - recordedExpenseAmount,
      receivedRatio: totalBilled === 0 ? 0 : totalReceived / totalBilled,
      outstandingRatio:
        totalBilled === 0 ? 0 : outstandingBalance / totalBilled,
      overdueInvoiceCount: periodInvoices.filter(
        (invoice) => invoice.status === "overdue",
      ).length,
      partiallyPaidInvoiceCount: periodInvoices.filter(
        (invoice) => invoice.status === "partially_paid",
      ).length,
      issuedInvoiceCount: periodInvoices.filter(
        (invoice) => invoice.status === "issued",
      ).length,
    },
    recentPayments,
    upcomingDueDates: [...dueDates.values()].sort((left, right) =>
      left.dueDate.localeCompare(right.dueDate),
    ),
    maintenanceSummary: deriveMaintenanceSummary(data),
    recentMaintenanceRecords: [...data.maintenanceRecords]
      .sort(
        (left, right) =>
          right.reportedDate.localeCompare(left.reportedDate) ||
          right.reference.localeCompare(left.reference),
      )
      .slice(0, 3),
    rooms: data.rooms,
  };
}

export type DashboardData = ReturnType<typeof deriveDashboard>;

export function deriveReports(data: WorkspaceData, reportingPeriod: string) {
  const periodInvoices = data.invoices.filter(
    (invoice) =>
      invoice.billingPeriod === reportingPeriod &&
      isReportableInvoice(invoice.status),
  );
  const completedPayments = data.payments.filter(
    (payment) =>
      payment.status === "completed" &&
      isDateInReportingPeriod(payment.paymentDate, reportingPeriod),
  );
  const activeLeases = data.leases.filter(
    (lease) => lease.status === "active",
  );
  const availableRooms = data.rooms.filter(
    (room) => room.status === "Available",
  );
  const operationalExpenses = data.expenses.filter(
    (expense) =>
      expense.status !== "void" &&
      isDateInReportingPeriod(expense.expenseDate, reportingPeriod),
  );
  const recordedExpenses = data.expenses.filter(
    (expense) =>
      expense.status === "recorded" &&
      isDateInReportingPeriod(expense.expenseDate, reportingPeriod),
  );
  const pendingExpenses = data.expenses.filter(
    (expense) =>
      expense.status === "pending" &&
      isDateInReportingPeriod(expense.expenseDate, reportingPeriod),
  );
  const periodVoidExpenses = data.expenses.filter(
    (expense) =>
      expense.status === "void" &&
      isDateInReportingPeriod(expense.expenseDate, reportingPeriod),
  );
  const locations = [
    ...new Set(data.rooms.map((room) => room.location)),
  ] as readonly RoomLocation[];
  const totalBilled = periodInvoices.reduce(
    (total, invoice) => total + invoice.amount,
    0,
  );
  const totalReceived = completedPayments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  const outstandingBalance = periodInvoices.reduce(
    (total, invoice) => total + invoice.balance,
    0,
  );
  const recordedExpenseAmount = recordedExpenses.reduce(
    (total, expense) => total + expense.amount,
    0,
  );
  const maintenanceSummary = deriveMaintenanceSummary(data);

  return {
    propertyReport: {
      totalRooms: data.rooms.length,
      occupiedRooms: data.rooms.filter(
        (room) => room.status === "Occupied",
      ).length,
      availableRooms: availableRooms.length,
      availableRoomNumbers: availableRooms.map((room) => room.roomNumber),
      occupancyRate:
        data.rooms.length === 0
          ? 0
          : data.rooms.filter((room) => room.status === "Occupied").length /
            data.rooms.length,
      areas: locations.map((location) => {
        const rooms = data.rooms.filter((room) => room.location === location);
        const occupied = rooms.filter(
          (room) => room.status === "Occupied",
        ).length;

        return {
          location,
          total: rooms.length,
          occupied,
          available: rooms.filter((room) => room.status === "Available")
            .length,
          occupancyRate: rooms.length === 0 ? 0 : occupied / rooms.length,
        };
      }),
    },
    rentalReport: {
      activeTenants: data.tenants.filter(
        (tenant) => tenant.tenantStatus === "active",
      ).length,
      activeLeases: activeLeases.length,
      activeLeaseMonthlyValue: activeLeases.reduce(
        (total, lease) => total + lease.monthlyRent,
        0,
      ),
      vacancyImpact: availableRooms.reduce(
        (total, room) => total + room.monthlyRate,
        0,
      ),
      fullOccupancyPotential: data.rooms.reduce(
        (total, room) => total + room.monthlyRate,
        0,
      ),
    },
    billingReport: {
      billingPeriod: reportingPeriod,
      totalBilled,
      totalReceived,
      outstandingBalance,
      collectionRate: totalBilled === 0 ? 0 : totalReceived / totalBilled,
      statusCounts: {
        paid: periodInvoices.filter((invoice) => invoice.status === "paid")
          .length,
        partiallyPaid: periodInvoices.filter(
          (invoice) => invoice.status === "partially_paid",
        ).length,
        issued: periodInvoices.filter(
          (invoice) => invoice.status === "issued",
        ).length,
        overdue: periodInvoices.filter(
          (invoice) => invoice.status === "overdue",
        ).length,
      },
    },
    expenseReport: {
      operationalAmount: operationalExpenses.reduce(
        (total, expense) => total + expense.amount,
        0,
      ),
      recordedAmount: recordedExpenseAmount,
      pendingAmount: pendingExpenses.reduce(
        (total, expense) => total + expense.amount,
        0,
      ),
      recordedCount: recordedExpenses.length,
      pendingCount: pendingExpenses.length,
      voidCount: periodVoidExpenses.length,
      categoryBreakdown: EXPENSE_CATEGORIES.map((category) => {
        const records = operationalExpenses.filter(
          (expense) => expense.category === category,
        );

        return {
          category,
          amount: records.reduce(
            (total, expense) => total + expense.amount,
            0,
          ),
          count: records.length,
        };
      }).filter((item) => item.count > 0),
    },
    cashPositionReport: {
      completedPayments: totalReceived,
      includedRecordedExpenses: recordedExpenseAmount,
      netOperatingCashPosition: totalReceived - recordedExpenseAmount,
    },
    maintenanceReport: {
      ...maintenanceSummary,
      categoryBreakdown: MAINTENANCE_CATEGORIES.map((category) => ({
        category,
        count: data.maintenanceRecords.filter(
          (record) => record.category === category,
        ).length,
      })).filter((item) => item.count > 0),
    },
    attentionReport: {
      availableRooms: availableRooms.length,
      availableRoomNumbers: availableRooms.map((room) => room.roomNumber),
      overdueInvoices: periodInvoices.filter(
        (invoice) => invoice.status === "overdue",
      ).length,
      partiallyPaidInvoices: periodInvoices.filter(
        (invoice) => invoice.status === "partially_paid",
      ).length,
      urgentMaintenance: data.maintenanceRecords.filter(
        (record) =>
          record.priority === "urgent" &&
          record.status !== "completed" &&
          record.status !== "cancelled",
      ).length,
      pendingExpenses: pendingExpenses.length,
    },
  };
}

export type ReportsData = ReturnType<typeof deriveReports>;

export function deriveSettings(data: WorkspaceData) {
  const occupancy = deriveOccupancy(data);
  const availableRooms = data.rooms.filter(
    (room) => room.status === "Available",
  );
  const activeLeases = data.leases.filter(
    (lease) => lease.status === "active",
  );
  const rateCounts = new Map<number, number>();

  for (const room of data.rooms) {
    rateCounts.set(
      room.monthlyRate,
      (rateCounts.get(room.monthlyRate) ?? 0) + 1,
    );
  }

  const locations: readonly RoomLocation[] = ["North Wing", "South Wing"];
  const invoiceLifecycleOrder: readonly InvoiceStatus[] = [
    "issued",
    "partially_paid",
    "paid",
    "overdue",
  ];

  return {
    applicationConfiguration: {
      propertyName: data.property.name,
      propertyType: "Managed Residential Rental",
      timezone: data.property.timezone,
      displayTimezone: "WIT",
      currencyCode: data.property.currencyCode,
      currencyName: "Indonesian Rupiah",
      applicationMode: "Authenticated Supabase operational workspace",
      persistenceStatus: "Supabase reads and authorized writes connected",
      authenticationStatus: "Supabase Auth connected",
      databaseStatus: "Property-scoped RLS with role-scoped writes",
      crudStatus: "Rooms, tenants, leases, invoices, and payments",
    },
    propertyStructure: locations.map((location) => {
      const rooms = data.rooms.filter((room) => room.location === location);
      const groups = [
        {
          label: "Floor 1",
          rooms: rooms.filter((room) => room.floor === 1),
        },
        {
          label: "Floor 2",
          rooms: rooms.filter((room) => room.floor === 2),
        },
      ];

      return {
        location,
        totalRooms: rooms.length,
        roomGroups: groups.map((group) => ({
          label: group.label,
          count: group.rooms.length,
          roomNumbers: group.rooms.map((room) => room.roomNumber),
        })),
      };
    }),
    occupancyConfiguration: {
      totalRooms: occupancy.total,
      occupiedRooms: occupancy.occupied,
      availableRooms: occupancy.available,
      availableRoomNumbers: availableRooms.map((room) => room.roomNumber),
      occupancyRate:
        occupancy.total === 0 ? 0 : occupancy.occupied / occupancy.total,
    },
    rentalConfiguration: {
      fullOccupancyPotential: data.rooms.reduce(
        (total, room) => total + room.monthlyRate,
        0,
      ),
      activeLeaseMonthlyValue: activeLeases.reduce(
        (total, lease) => total + lease.monthlyRent,
        0,
      ),
      vacancyImpact: availableRooms.reduce(
        (total, room) => total + room.monthlyRate,
        0,
      ),
      rateTiers: [...rateCounts.entries()]
        .sort(([left], [right]) => left - right)
        .map(([monthlyRate, roomCount]) => ({ monthlyRate, roomCount })),
    },
    billingConfiguration: {
      demoBillingPeriod: DEMO_BILLING_PERIOD,
      hasLeaseBillingDays: activeLeases.some(
        (lease) => Number.isInteger(lease.billingDay) && lease.billingDay > 0,
      ),
      invoiceLifecycle: invoiceLifecycleOrder.filter((status) =>
        data.invoices.some((invoice) => invoice.status === status),
      ),
      paymentMethods: PAYMENT_METHODS,
    },
    moduleReadiness: [
      { module: "Dashboard", status: "Database-backed operational summary" },
      { module: "Rooms", status: "Canonical reads + authorized updates" },
      { module: "Tenants", status: "Supabase reads + authorized writes" },
      { module: "Leases", status: "Supabase reads + authorized writes" },
      { module: "Invoices", status: "Supabase reads + authorized writes" },
      { module: "Payments", status: "Supabase reads + authorized writes" },
      { module: "Expenses", status: "Supabase reads + authorized writes" },
      { module: "Maintenance", status: "Supabase reads + authorized writes" },
      { module: "Reports", status: "Derived from Supabase reads" },
      { module: "Settings", status: "Database configuration overview" },
    ],
  };
}

export type SettingsData = ReturnType<typeof deriveSettings>;
