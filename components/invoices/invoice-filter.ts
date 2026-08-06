import type { InvoiceStatus } from "@/lib/data/types";

export type InvoiceStatusFilter =
  | "all"
  | "paid"
  | "issued"
  | "partially_paid"
  | "overdue";

export type InvoiceListRecord = {
  id: string;
  reference: string;
  status: InvoiceStatus;
  billingPeriod: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balance: number;
  lease: {
    id: string;
    reference: string;
  };
  tenant: {
    id: string;
    fullName: string;
  };
  room: {
    id: string;
    roomNumber: string;
  };
};

export function filterInvoiceRecords(
  records: readonly InvoiceListRecord[],
  query: string,
  status: InvoiceStatusFilter,
): readonly InvoiceListRecord[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("en");

  return records.filter((invoice) => {
    const matchesStatus = status === "all" || invoice.status === status;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      invoice.reference.toLocaleLowerCase("en").includes(normalizedQuery) ||
      invoice.tenant.fullName
        .toLocaleLowerCase("en")
        .includes(normalizedQuery) ||
      invoice.room.roomNumber
        .toLocaleLowerCase("en")
        .includes(normalizedQuery);

    return matchesStatus && matchesQuery;
  });
}
