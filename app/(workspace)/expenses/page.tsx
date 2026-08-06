import type { Metadata } from "next";
import type {
  ExpenseCategoryFilter,
  ExpenseListRecord,
  ExpenseStatusFilter,
} from "@/components/expenses/expense-filter";
import { ExpensesManagement } from "@/components/expenses/expenses-management";
import { getPropertyAccess, hasRole } from "@/lib/auth/access";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  type Expense,
  type Room,
} from "@/lib/data/types";
import { deriveExpenseSummary } from "@/lib/data/derived";
import { getWorkspaceData } from "@/lib/data/workspace-read";

export const metadata: Metadata = {
  title: "Expenses",
  description: "Fictional Emerald Haven Residence operating expense records.",
};

function parseFilter<T extends string>(
  value: string | string[] | undefined,
  allowedValues: readonly T[],
  fallback: T,
): T {
  const candidate = Array.isArray(value) ? value[0] : value;
  return allowedValues.find((allowed) => allowed === candidate) ?? fallback;
}

function createExpenseListRecord(
  expense: Expense,
  roomById: ReadonlyMap<string, Room>,
): ExpenseListRecord {
  const room = expense.roomId ? roomById.get(expense.roomId) : null;

  if (expense.roomId && !room) {
    throw new Error(`Missing room for expense ${expense.id}.`);
  }

  return {
    id: expense.id,
    reference: expense.reference,
    expenseDate: expense.expenseDate,
    category: expense.category,
    description: expense.description,
    amount: expense.amount,
    paymentMethod: expense.paymentMethod,
    vendor: expense.vendor,
    status: expense.status,
    room: room
      ? {
          id: room.id,
          roomNumber: room.roomNumber,
          location: room.location,
        }
      : null,
  };
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string | string[];
    category?: string | string[];
  }>;
}) {
  const parameters = await searchParams;
  const [data, access] = await Promise.all([
    getWorkspaceData(),
    getPropertyAccess(),
  ]);

  if (!data) {
    return null;
  }

  const roomById = new Map(data.rooms.map((room) => [room.id, room]));
  const records = data.expenses.map((expense) =>
    createExpenseListRecord(expense, roomById),
  );
  const allowedStatuses: readonly ExpenseStatusFilter[] = [
    "all",
    ...EXPENSE_STATUSES,
  ];
  const allowedCategories: readonly ExpenseCategoryFilter[] = [
    "all",
    ...EXPENSE_CATEGORIES,
  ];

  return (
    <ExpensesManagement
      records={records}
      summary={deriveExpenseSummary(data)}
      initialStatus={parseFilter(
        parameters.status,
        allowedStatuses,
        "all",
      )}
      initialCategory={parseFilter(
        parameters.category,
        allowedCategories,
        "all",
      )}
      canManage={
        access.status === "authorized" &&
        hasRole(access, ["owner", "admin"])
      }
      rooms={data.rooms.map((room) => ({
        id: room.id,
        roomNumber: room.roomNumber,
      }))}
      defaultExpenseDate={new Date().toISOString().slice(0, 10)}
    />
  );
}
