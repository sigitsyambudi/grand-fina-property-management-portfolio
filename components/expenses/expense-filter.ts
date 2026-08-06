import type {
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseStatus,
} from "@/lib/data/types";

export type ExpenseStatusFilter = "all" | ExpenseStatus;
export type ExpenseCategoryFilter = "all" | ExpenseCategory;

export type ExpenseListRecord = {
  id: string;
  reference: string;
  expenseDate: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  vendor: string;
  status: ExpenseStatus;
  room: {
    id: string;
    roomNumber: string;
    location: string;
  } | null;
};

export function filterExpenseRecords(
  records: readonly ExpenseListRecord[],
  query: string,
  status: ExpenseStatusFilter,
  category: ExpenseCategoryFilter,
): readonly ExpenseListRecord[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("en");

  return records.filter((expense) => {
    const matchesStatus = status === "all" || expense.status === status;
    const matchesCategory =
      category === "all" || expense.category === category;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      expense.reference.toLocaleLowerCase("en").includes(normalizedQuery) ||
      expense.description.toLocaleLowerCase("en").includes(normalizedQuery) ||
      expense.vendor.toLocaleLowerCase("en").includes(normalizedQuery) ||
      expense.room?.roomNumber
        .toLocaleLowerCase("en")
        .includes(normalizedQuery) === true;

    return matchesStatus && matchesCategory && matchesQuery;
  });
}
