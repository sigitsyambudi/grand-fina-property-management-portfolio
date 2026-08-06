import type {
  PaymentMethod,
  PaymentStatus,
} from "@/lib/data/types";

export type PaymentStatusFilter = "all" | PaymentStatus;

export type PaymentListRecord = {
  id: string;
  reference: string;
  status: PaymentStatus;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  invoice: {
    id: string;
    reference: string;
  };
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

export function filterPaymentRecords(
  records: readonly PaymentListRecord[],
  query: string,
  status: PaymentStatusFilter,
): readonly PaymentListRecord[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("en");

  return records.filter((payment) => {
    const matchesStatus = status === "all" || payment.status === status;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      payment.reference.toLocaleLowerCase("en").includes(normalizedQuery) ||
      payment.invoice.reference
        .toLocaleLowerCase("en")
        .includes(normalizedQuery) ||
      payment.tenant.fullName
        .toLocaleLowerCase("en")
        .includes(normalizedQuery) ||
      payment.room.roomNumber
        .toLocaleLowerCase("en")
        .includes(normalizedQuery);

    return matchesStatus && matchesQuery;
  });
}
