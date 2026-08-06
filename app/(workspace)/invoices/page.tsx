import type { Metadata } from "next";
import type {
  InvoiceListRecord,
  InvoiceStatusFilter,
} from "@/components/invoices/invoice-filter";
import { InvoicesManagement } from "@/components/invoices/invoices-management";
import { getPropertyAccess, hasRole } from "@/lib/auth/access";
import type { Invoice, Lease, Room, Tenant } from "@/lib/data/types";
import { getWorkspaceData } from "@/lib/data/workspace-read";

export const metadata: Metadata = {
  title: "Invoices",
  description: "Fictional Emerald Haven Residence invoices and billing balances.",
};

const allowedStatuses: readonly InvoiceStatusFilter[] = [
  "all",
  "paid",
  "issued",
  "partially_paid",
  "overdue",
];

function isInvoiceStatusFilter(value: unknown): value is InvoiceStatusFilter {
  return (
    typeof value === "string" &&
    allowedStatuses.some((status) => status === value)
  );
}

function parseStatus(
  value: string | string[] | undefined,
): InvoiceStatusFilter {
  const status = Array.isArray(value) ? value[0] : value;
  return isInvoiceStatusFilter(status) ? status : "all";
}

function createInvoiceListRecord(
  invoice: Invoice,
  leaseById: ReadonlyMap<string, Lease>,
  tenantById: ReadonlyMap<string, Tenant>,
  roomById: ReadonlyMap<string, Room>,
): InvoiceListRecord {
  const lease = leaseById.get(invoice.leaseId);

  if (!lease) {
    throw new Error(`Missing lease for invoice ${invoice.id}.`);
  }

  const tenant = tenantById.get(lease.tenantId);
  const room = roomById.get(lease.roomId);

  if (!tenant || !room) {
    throw new Error(`Invalid canonical references for invoice ${invoice.id}.`);
  }

  return {
    id: invoice.id,
    reference: invoice.reference,
    status: invoice.status,
    billingPeriod: invoice.billingPeriod,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    amount: invoice.amount,
    paidAmount: invoice.paidAmount,
    balance: invoice.balance,
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

function getNextBillingPeriod(invoices: readonly Invoice[]): string {
  const latestPeriod = invoices
    .map((invoice) => invoice.billingPeriod)
    .sort()
    .at(-1);

  if (!latestPeriod) {
    return new Date().toISOString().slice(0, 7);
  }

  const [year, month] = latestPeriod.split("-").map(Number);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
}

export default async function InvoicesPage({
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

  const leaseById = new Map(data.leases.map((lease) => [lease.id, lease]));
  const tenantById = new Map(
    data.tenants.map((tenant) => [tenant.id, tenant]),
  );
  const roomById = new Map(data.rooms.map((room) => [room.id, room]));
  const records = data.invoices.map((invoice) =>
    createInvoiceListRecord(
      invoice,
      leaseById,
      tenantById,
      roomById,
    ),
  );
  return (
    <InvoicesManagement
      records={records}
      initialStatus={parseStatus(parameters.status)}
      canManage={
        access.status === "authorized" &&
        hasRole(access, ["owner", "admin"])
      }
      billableLeases={data.leases.map((lease) => {
        const tenant = tenantById.get(lease.tenantId);
        const room = roomById.get(lease.roomId);

        if (!tenant || !room) {
          throw new Error(
            `Invalid billing relationship for lease ${lease.id}.`,
          );
        }

        return {
          id: lease.id,
          reference: lease.reference,
          tenantName: tenant.fullName,
          roomNumber: room.roomNumber,
          startDate: lease.startDate,
          endDate: lease.endDate,
          monthlyRent: lease.monthlyRent,
          billingDay: lease.billingDay,
        };
      })}
      suggestedBillingPeriod={getNextBillingPeriod(data.invoices)}
      defaultIssueDate={new Date().toISOString().slice(0, 10)}
    />
  );
}
