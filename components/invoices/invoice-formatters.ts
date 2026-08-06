import type { Locale } from "@/lib/i18n/types";

export function formatBillingPeriod(
  billingPeriod: string,
  locale: Locale = "en",
): string {
  const [year, month] = billingPeriod.split("-").map(Number);

  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}
