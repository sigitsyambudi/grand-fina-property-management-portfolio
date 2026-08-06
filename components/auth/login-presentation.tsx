"use client";

import { LanguageSelector } from "@/components/localization/language-selector";
import { useLocalization } from "@/components/localization/localization-provider";
import { LoginForm } from "./login-form";

export function LoginPresentation() {
  const { t } = useLocalization();

  return (
    <main className="grid min-h-screen bg-[#f5f4ef] lg:grid-cols-[minmax(22rem,0.82fr)_1.18fr]">
      <section className="relative hidden overflow-hidden bg-[var(--brand-strong)] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="border-l-2 border-[#b08a4a] pl-4">
          <p className="font-semibold tracking-[0.04em]">Grand Fina Portfolio Edition</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[#8fa19a]">
            {t("shell.propertyManagement")}
          </p>
        </div>
        <div className="max-w-lg">
          <div className="mb-6 h-px w-16 bg-[#b08a4a]" />
          <p className="text-3xl font-semibold leading-tight tracking-[-0.02em]">
            {t("auth.heroTitle")}
          </p>
          <p className="mt-4 max-w-md text-sm leading-6 text-[#b8c5c0]">
            {t("auth.heroDescription")}
          </p>
        </div>
        <p className="text-xs text-[#71867e]">
          Portfolio Edition · {t("auth.internalOperations")}
        </p>
      </section>

      <section className="flex min-h-screen flex-col px-5 py-5 sm:px-8 lg:px-14 lg:py-8">
        <div className="flex items-center justify-between lg:justify-end">
          <span className="text-sm font-semibold text-[var(--foreground)] lg:hidden">
            Grand Fina Portfolio Edition
          </span>
          <LanguageSelector compact />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <LoginForm />
        </div>

        <p className="text-center text-xs text-[var(--muted)]">
          Asia/Jayapura · WIT
        </p>
      </section>
    </main>
  );
}
