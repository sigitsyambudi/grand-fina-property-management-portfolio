"use client";

import { formatExpenseCategory } from "@/components/expenses/expense-formatters";
import { useLocalization } from "@/components/localization/localization-provider";
import type { ExpenseCategory } from "@/lib/data/types";

export function ExpenseCategoryBadge({
  category,
}: {
  category: ExpenseCategory;
}) {
  const { locale } = useLocalization();

  return (
    <span className="inline-flex items-center rounded bg-[#edf0ee] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#4f5d57]">
      {formatExpenseCategory(category, locale)}
    </span>
  );
}
