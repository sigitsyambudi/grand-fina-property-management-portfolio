"use server";

import { revalidatePath } from "next/cache";
import {
  createExpense,
  updateExpense,
  voidExpense,
  type ExpenseMutationResult,
} from "@/lib/data/expense-write";

function revalidateExpenseRoutes(expenseId: string): void {
  revalidatePath("/");
  revalidatePath("/expenses");
  revalidatePath(`/expenses/${expenseId}`);
  revalidatePath("/reports");
  revalidatePath("/settings");
}

export async function createExpenseAction(
  _previousState: ExpenseMutationResult,
  formData: FormData,
): Promise<ExpenseMutationResult> {
  const result = await createExpense(formData);

  if (result.status === "success") {
    revalidateExpenseRoutes(result.expenseId);
  }

  return result;
}

export async function updateExpenseAction(
  expenseId: string,
  _previousState: ExpenseMutationResult,
  formData: FormData,
): Promise<ExpenseMutationResult> {
  const result = await updateExpense(expenseId, formData);

  if (result.status === "success") {
    revalidateExpenseRoutes(result.expenseId);
  }

  return result;
}

export async function voidExpenseAction(
  expenseId: string,
  _previousState: ExpenseMutationResult,
  formData: FormData,
): Promise<ExpenseMutationResult> {
  const result = await voidExpense(expenseId, formData);

  if (result.status === "success") {
    revalidateExpenseRoutes(result.expenseId);
  }

  return result;
}
