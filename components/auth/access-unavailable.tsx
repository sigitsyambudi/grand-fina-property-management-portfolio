"use client";

import { LanguageSelector } from "@/components/localization/language-selector";
import { useLocalization } from "@/components/localization/localization-provider";
import { SignOutButton } from "./sign-out-button";

export function AccessUnavailable() {
  const { t } = useLocalization();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f4ef] px-5 py-10">
      <section className="w-full max-w-lg border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex justify-end">
          <LanguageSelector compact />
        </div>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          Grand Fina Portfolio Edition
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
          {t("auth.accessUnavailable")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          {t("auth.noPropertyAccess")}
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          {t("auth.accessHelp")}
        </p>
        <div className="mt-7">
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
