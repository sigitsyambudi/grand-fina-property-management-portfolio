import type {
  ExpenseCategory,
  ExpensePaymentMethod,
} from "@/lib/data/types";
import { translate } from "@/lib/i18n/dictionaries";
import type { Locale, TranslationKey } from "@/lib/i18n/types";

const categoryKeys: Record<ExpenseCategory, TranslationKey> = {
  utilities: "expenses.category.utilities",
  maintenance: "expenses.category.maintenance",
  internet: "expenses.category.internet",
  cleaning: "expenses.category.cleaning",
  supplies: "expenses.category.supplies",
  payroll: "expenses.category.payroll",
  security: "expenses.category.security",
  taxes_fees: "expenses.category.taxesFees",
  other: "expenses.category.other",
};

const paymentMethodKeys: Record<ExpensePaymentMethod, TranslationKey> = {
  bank_transfer: "common.method.bankTransfer",
  cash: "common.method.cash",
  e_wallet: "common.method.eWallet",
  other: "common.method.other",
};

export function formatExpenseCategory(
  category: ExpenseCategory,
  locale: Locale = "en",
): string {
  return translate(locale, categoryKeys[category]);
}

export function formatExpensePaymentMethod(
  paymentMethod: ExpensePaymentMethod,
  locale: Locale = "en",
): string {
  return translate(locale, paymentMethodKeys[paymentMethod]);
}
