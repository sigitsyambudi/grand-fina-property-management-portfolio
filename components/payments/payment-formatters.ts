import type { PaymentMethod } from "@/lib/data/types";
import { translate } from "@/lib/i18n/dictionaries";
import type { Locale, TranslationKey } from "@/lib/i18n/types";

const paymentMethodKeys: Record<PaymentMethod, TranslationKey> = {
  bank_transfer: "common.method.bankTransfer",
  cash: "common.method.cash",
  e_wallet: "common.method.eWallet",
  other: "common.method.other",
};

export function formatPaymentMethod(
  method: PaymentMethod,
  locale: Locale = "en",
): string {
  return translate(locale, paymentMethodKeys[method]);
}
