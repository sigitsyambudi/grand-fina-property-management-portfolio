import { translate } from "./dictionaries";
import type { Locale, TranslationKey } from "./types";

const displayValueKeys: Readonly<Record<string, TranslationKey>> = {
  "South Wing": "common.location.southWing",
  "North Wing": "common.location.northWing",
  "Managed Residential Rental": "display.propertyType",
  "Indonesian Rupiah": "display.currencyName",
  "Authenticated Supabase operational workspace": "display.applicationMode",
  "Supabase reads and authorized writes connected": "display.persistenceStatus",
  "Supabase Auth connected": "display.authenticationStatus",
  "Property-scoped RLS with role-scoped writes": "display.databaseStatus",
  "Rooms, tenants, leases, invoices, and payments": "display.crudStatus",
  "Floor 1": "display.floor1",
  "Floor 2": "display.floor2",
  "Configured rooms": "display.configuredRooms",
  Dashboard: "display.module.dashboard",
  Rooms: "display.module.rooms",
  Tenants: "display.module.tenants",
  Leases: "display.module.leases",
  Invoices: "display.module.invoices",
  Payments: "display.module.payments",
  Expenses: "display.module.expenses",
  Maintenance: "display.module.maintenance",
  Reports: "display.module.reports",
  Settings: "display.module.settings",
  "Database-backed operational summary": "display.status.dashboard",
  "Canonical reads + authorized updates": "display.status.rooms",
  "Supabase reads + authorized writes": "display.status.supabaseWrites",
  "Derived from Supabase reads": "display.status.reports",
  "Database configuration overview": "display.status.settings",
};

export function formatDisplayValue(value: string, locale: Locale): string {
  const key = displayValueKeys[value];
  return key ? translate(locale, key) : value;
}
