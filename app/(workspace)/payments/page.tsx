import type { Metadata } from "next";
import type {
  PaymentListRecord,
  PaymentStatusFilter,
} from "@/components/payments/payment-filter";
import { PaymentsManagement } from "@/components/payments/payments-management";
import { getPropertyAccess, hasRole } from "@/lib/auth/access";
import type {
  Invoice,
  Lease,
  Payment,
  Room,
  Tenant,
} from "@/lib/data/types";
import { getWorkspaceData } from "@/lib/data/workspace-read";

export const metadata: Metadata = {
  title: "Payments",
  description: "Fictional Emerald Haven Residence payment records and allocations.",
};

const allowedStatuses: readonly PaymentStatusFilter[] = [
  "all",
  "completed",
  "pending",
  "reversed",
];

function isPaymentStatusFilter(value: unknown): value is PaymentStatusFilter {
  return (
    typeof value === "string" &&
    allowedStatuses.some((status) => status === value)
  );
}

function parseStatus(
  value: string | string[] | undefined,
): PaymentStatusFilter {
  const status = Array.isArray(value) ? value[0] : value;
  return isPaymentStatusFilter(status) ? status : "all";
}

function createPaymentListRecord(
  payment: Payment,
  invoiceById: ReadonlyMap<string, Invoice>,
  leaseById: ReadonlyMap<string, Lease>,
  tenantById: ReadonlyMap<string, Tenant>,
  roomById: ReadonlyMap<string, Room>,
): PaymentListRecord {
  const invoice = invoiceById.get(payment.invoiceId);

  if (!invoice) {
    throw new Error(`Missing invoice for payment ${payment.id}.`);
  }

  const lease = leaseById.get(invoice.leaseId);

  if (!lease) {
    throw new Error(`Missing lease for payment ${payment.id}.`);
  }

  const tenant = tenantById.get(lease.tenantId);
  const room = roomById.get(lease.roomId);

  if (!tenant || !room) {
    throw new Error(`Invalid canonical references for payment ${payment.id}.`);
  }

  return {
    id: payment.id,
    reference: payment.reference,
    status: payment.status,
    amount: payment.amount,
    paymentDate: payment.paymentDate,
    method: payment.method,
    invoice: {
      id: invoice.id,
      reference: invoice.reference,
    },
    lease: {
      id: lease.id,
      reference: lease.reference,
    },
    tenant: {
      id: tenant.id,
      fullName: tenant.fullName,
    },
    room: {
      id: room.id,
      roomNumber: room.roomNumber,
    },
  };
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const parameters = await searchParams;
  const [data, access] = await Promise.all([
    getWorkspaceData(),
    getPropertyAccess(),
  ]);

  if (!data) {
    return null;
  }

  const invoiceById = new Map(
    data.invoices.map((invoice) => [invoice.id, invoice]),
  );
  const leaseById = new Map(data.leases.map((lease) => [lease.id, lease]));
  const tenantById = new Map(
    data.tenants.map((tenant) => [tenant.id, tenant]),
  );
  const roomById = new Map(data.rooms.map((room) => [room.id, room]));
  const records = data.payments.map((payment) =>
    createPaymentListRecord(
      payment,
      invoiceById,
      leaseById,
      tenantById,
      roomById,
    ),
  );
  const outstandingInvoices = data.invoices
    .filter((invoice) => invoice.balance > 0 && invoice.status !== "void")
    .map((invoice) => {
      const lease = leaseById.get(invoice.leaseId);
      const tenant = lease ? tenantById.get(lease.tenantId) : null;
      const room = lease ? roomById.get(lease.roomId) : null;

      if (!lease || !tenant || !room) {
        throw new Error(
          `Invalid payment relationship for invoice ${invoice.id}.`,
        );
      }

      return {
        id: invoice.id,
        reference: invoice.reference,
        billingPeriod: invoice.billingPeriod,
        amount: invoice.amount,
        paidAmount: invoice.paidAmount,
        remainingBalance: invoice.balance,
        tenantName: tenant.fullName,
        roomNumber: room.roomNumber,
      };
    });

  return (
    <PaymentsManagement
      records={records}
      initialStatus={parseStatus(parameters.status)}
      canManage={
        access.status === "authorized" &&
        hasRole(access, ["owner", "admin"])
      }
      outstandingInvoices={outstandingInvoices}
      defaultPaymentDate={new Date().toISOString().slice(0, 10)}
    />
  );
}
