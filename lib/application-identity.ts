import type { TranslationKey } from "@/lib/i18n/types";

type ApplicationIdentity = {
  applicationName: string;
  descriptionKey: TranslationKey;
  editionKey: TranslationKey;
  overviewKey: TranslationKey;
  developmentDescriptionKey: TranslationKey;
  personasDescriptionKey: TranslationKey;
  version: string;
  releaseKey: TranslationKey;
  environmentKey: TranslationKey;
  statusKey: TranslationKey;
  leadDeveloper: string;
  developerRoleKey: TranslationKey;
  copyrightYear: number;
  copyrightOwner: string;
  supportedLocales: readonly ["id", "en"];
  systemSummary: {
    rooms: number;
    applicationRoles: number;
    supportedLanguages: number;
    rlsProtectedTables: number;
  };
  technologyStack: readonly string[];
  capabilityKeys: readonly TranslationKey[];
};

export const applicationIdentity = {
  applicationName: "Grand Fina Property Management — Portfolio Edition",
  descriptionKey: "identity.description",
  editionKey: "identity.edition.portfolio",
  overviewKey: "about.overview",
  developmentDescriptionKey: "about.developmentDescription",
  personasDescriptionKey: "about.personasDescription",
  version: "1.0.0",
  releaseKey: "identity.release",
  environmentKey: "identity.environment",
  statusKey: "identity.status",
  leadDeveloper: "Sigit Syambudi",
  developerRoleKey: "identity.developerRole",
  copyrightYear: 2026,
  copyrightOwner: "Grand Fina Portfolio Edition",
  supportedLocales: ["id", "en"],
  systemSummary: {
    rooms: 24,
    applicationRoles: 4,
    supportedLanguages: 2,
    rlsProtectedTables: 10,
  },
  technologyStack: [
    "Next.js 16.3",
    "React",
    "TypeScript",
    "Tailwind CSS",
    "Supabase",
    "PostgreSQL",
  ],
  capabilityKeys: [
    "about.capability.dashboard",
    "about.capability.rooms",
    "about.capability.tenants",
    "about.capability.leases",
    "about.capability.invoices",
    "about.capability.payments",
    "about.capability.expenses",
    "about.capability.maintenance",
    "about.capability.reports",
    "about.capability.auth",
    "about.capability.localization",
    "about.capability.rls",
  ],
} as const satisfies ApplicationIdentity;
