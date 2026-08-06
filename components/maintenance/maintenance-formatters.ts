import type {
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
} from "@/lib/data/types";
import { translate } from "@/lib/i18n/dictionaries";
import type { Locale, TranslationKey } from "@/lib/i18n/types";

const statusKeys: Record<MaintenanceStatus, TranslationKey> = {
  open: "common.status.open",
  in_progress: "common.status.inProgress",
  completed: "common.status.completed",
  cancelled: "common.status.cancelled",
};

const priorityKeys: Record<MaintenancePriority, TranslationKey> = {
  low: "common.priority.low",
  medium: "common.priority.medium",
  high: "common.priority.high",
  urgent: "common.priority.urgent",
};

const categoryKeys: Record<MaintenanceCategory, TranslationKey> = {
  plumbing: "maintenance.category.plumbing",
  electrical: "maintenance.category.electrical",
  ac: "maintenance.category.ac",
  furniture: "maintenance.category.furniture",
  appliance: "maintenance.category.appliance",
  internet: "maintenance.category.internet",
  building: "maintenance.category.building",
  cleaning: "maintenance.category.cleaning",
  other: "maintenance.category.other",
};

export function formatMaintenanceStatus(
  status: MaintenanceStatus,
  locale: Locale = "en",
): string {
  return translate(locale, statusKeys[status]);
}

export function formatMaintenancePriority(
  priority: MaintenancePriority,
  locale: Locale = "en",
): string {
  return translate(locale, priorityKeys[priority]);
}

export function formatMaintenanceCategory(
  category: MaintenanceCategory,
  locale: Locale = "en",
): string {
  return translate(locale, categoryKeys[category]);
}
