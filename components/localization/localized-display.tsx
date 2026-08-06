"use client";

import { formatBillingPeriod } from "@/components/invoices/invoice-formatters";
import { formatPaymentMethod } from "@/components/payments/payment-formatters";
import {
  formatExpenseCategory,
  formatExpensePaymentMethod,
} from "@/components/expenses/expense-formatters";
import { formatRoomDate } from "@/components/rooms/room-formatters";
import type {
  ExpenseCategory,
  ExpensePaymentMethod,
  PaymentMethod,
} from "@/lib/data/types";
import { formatDisplayValue } from "@/lib/i18n/display-values";
import { formatRecordText } from "@/lib/i18n/record-text";
import { useLocalization } from "./localization-provider";

type LocalizedDisplayProps =
  | { kind: "date"; value: string }
  | { kind: "billing-period"; value: string }
  | { kind: "display-value"; value: string }
  | { kind: "record-text"; value: string }
  | { kind: "payment-method"; value: PaymentMethod }
  | { kind: "expense-category"; value: ExpenseCategory }
  | { kind: "expense-payment-method"; value: ExpensePaymentMethod }
  | { kind: "timestamp"; value: string; timeZone: string };

export function LocalizedDisplay(props: LocalizedDisplayProps) {
  const { locale } = useLocalization();

  switch (props.kind) {
    case "date":
      return formatRoomDate(props.value, locale);
    case "billing-period":
      return formatBillingPeriod(props.value, locale);
    case "display-value":
      return formatDisplayValue(props.value, locale);
    case "record-text":
      return formatRecordText(props.value, locale);
    case "payment-method":
      return formatPaymentMethod(props.value, locale);
    case "expense-category":
      return formatExpenseCategory(props.value, locale);
    case "expense-payment-method":
      return formatExpensePaymentMethod(props.value, locale);
    case "timestamp":
      return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: props.timeZone,
      }).format(new Date(props.value));
  }
}
