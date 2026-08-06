"use client";

import { useLocalization } from "@/components/localization/localization-provider";
import { applicationIdentity } from "@/lib/application-identity";

export function ApplicationFooter() {
  const { t } = useLocalization();

  return (
    <footer className="border-t border-[var(--border)] bg-white/70 px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-[var(--foreground)]">
            {applicationIdentity.applicationName}
          </p>
          <p className="mt-0.5">{t(applicationIdentity.editionKey)}</p>
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <p>
            {t("footer.version")} {applicationIdentity.version}
          </p>
          <p>
            {t("footer.leadDeveloper")}: {applicationIdentity.leadDeveloper}
          </p>
          <p>
            © {applicationIdentity.copyrightYear}{" "}
            {applicationIdentity.copyrightOwner}
          </p>
        </div>
      </div>
    </footer>
  );
}
