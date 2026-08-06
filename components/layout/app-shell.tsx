"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LanguageSelector } from "@/components/localization/language-selector";
import { useLocalization } from "@/components/localization/localization-provider";
import { ApplicationFooter } from "@/components/layout/application-footer";
import { GrandFinaLogo } from "@/components/layout/grand-fina-logo";
import type { WorkspaceIdentity } from "@/lib/auth/types";
import { applicationIdentity } from "@/lib/application-identity";
import type { TranslationKey } from "@/lib/i18n/types";
import { Navigation } from "./navigation";

const routeTitles: Record<string, TranslationKey> = {
  "/": "navigation.dashboard",
  "/rooms": "navigation.rooms",
  "/tenants": "navigation.tenants",
  "/leases": "navigation.leases",
  "/invoices": "navigation.invoices",
  "/payments": "navigation.payments",
  "/expenses": "navigation.expenses",
  "/maintenance": "navigation.maintenance",
  "/reports": "navigation.reports",
  "/settings": "navigation.settings",
  "/about": "navigation.about",
};

const roleKeys: Record<WorkspaceIdentity["role"], TranslationKey> = {
  owner: "auth.role.owner",
  admin: "auth.role.admin",
  staff: "auth.role.staff",
};

function Brand() {
  const { t } = useLocalization();

  return (
    <div className="flex items-center gap-3">
      <GrandFinaLogo placement="sidebar" />
      <div>
        <p className="text-[15px] font-semibold tracking-[0.04em] text-white">
          Grand Fina
        </p>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[#8fa19a]">
          {t("shell.propertyManagement")}
        </p>
      </div>
    </div>
  );
}

function SidebarContent({
  onNavigate,
  propertyName,
}: {
  onNavigate?: () => void;
  propertyName: string;
}) {
  const { t } = useLocalization();

  return (
    <>
      <Brand />
      <div className="my-6 border-y border-white/10 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#81948d]">
          {t("shell.currentProperty")}
        </p>
        <p className="mt-1.5 text-sm font-medium text-[#e5ebe8]">
          {propertyName}
        </p>
        <p className="mt-1 text-xs text-[#81948d]">
          {t("shell.roomsCount", { count: applicationIdentity.systemSummary.rooms })}
        </p>
      </div>
      <Navigation onNavigate={onNavigate} />
    </>
  );
}

export function AppShell({
  children,
  identity,
  propertyName,
}: {
  children: ReactNode;
  identity: WorkspaceIdentity;
  propertyName: string;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const { t } = useLocalization();
  const detailTitle: TranslationKey | null = pathname.startsWith("/rooms/")
    ? "rooms.details"
    : pathname.startsWith("/tenants/")
      ? "tenants.details"
      : pathname.startsWith("/leases/")
        ? "leases.details"
        : pathname.startsWith("/invoices/")
          ? "invoices.details"
          : pathname.startsWith("/payments/")
            ? "payments.details"
            : pathname.startsWith("/expenses/")
              ? "expenses.details"
              : pathname.startsWith("/maintenance/")
                ? "maintenance.details"
                : null;
  const pageTitleKey = detailTitle ?? routeTitles[pathname];
  const pageTitle = pageTitleKey ? t(pageTitleKey) : applicationIdentity.applicationName;
  const roleLabel = t(roleKeys[identity.role]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[var(--brand-strong)] px-4 py-5 lg:flex">
        <SidebarContent propertyName={propertyName} />
        <p className="mt-5 px-3 text-[10px] leading-4 text-[#6f827b]">
          {t("shell.internalWorkspace")}
        </p>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--border)] bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              aria-label={t("shell.openNavigation")}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              className="grid size-10 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-white text-[var(--brand)] hover:bg-[var(--surface-subtle)] lg:hidden"
            >
              <span aria-hidden="true" className="space-y-1">
                <span className="block h-0.5 w-4 bg-current" />
                <span className="block h-0.5 w-4 bg-current" />
                <span className="block h-0.5 w-4 bg-current" />
              </span>
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                {pageTitle}
              </p>
              <p className="hidden text-xs text-[var(--muted)] sm:block">
                {propertyName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden border-r border-[var(--border)] pr-4 text-right md:block">
              <p className="text-xs font-medium text-[var(--foreground)]">
                {t("shell.referenceDate")}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                {t("shell.timeZone")}
              </p>
            </div>
            <LanguageSelector compact />
            <button
              type="button"
              aria-label={t("shell.demoNotifications")}
              className="relative grid size-10 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-white text-[var(--brand)] hover:bg-[var(--surface-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px]" fill="none">
                <path
                  d="M8.5 18h7M10 20.5h4M6.5 16h11l-1.25-1.75V10a4.25 4.25 0 0 0-8.5 0v4.25L6.5 16Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div
              className="flex min-w-0 items-center gap-2"
              aria-label={t("auth.signedInAs", {
                name: identity.displayName,
                role: roleLabel,
              })}
            >
              <span className="hidden min-w-0 text-right xl:block">
                <span className="block max-w-40 truncate text-xs font-semibold text-[var(--foreground)]">
                  {identity.displayName}
                </span>
                <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
                  {roleLabel}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-white"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none">
                  <path
                    d="M12 12.25a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5ZM5.5 20c.65-3.2 3.1-5 6.5-5s5.85 1.8 6.5 5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
            <div className="hidden sm:block">
              <SignOutButton compact />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
        <ApplicationFooter />
      </div>

      {isMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("shell.closeNavigation")}
            onClick={() => setIsMenuOpen(false)}
            className="absolute inset-0 bg-black/45"
          />
          <aside
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label={t("shell.navigation")}
            className="relative flex h-full w-[min(84vw,20rem)] flex-col bg-[var(--brand-strong)] px-4 py-5 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <Brand />
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsMenuOpen(false)}
                aria-label={t("shell.closeNavigation")}
                className="grid size-9 place-items-center rounded-md border border-white/15 text-lg text-white hover:bg-white/10"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="my-5 border-y border-white/10 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#81948d]">
                {t("shell.currentProperty")}
              </p>
              <p className="mt-1.5 text-sm font-medium text-[#e5ebe8]">
                {propertyName}
              </p>
            </div>
            <Navigation onNavigate={() => setIsMenuOpen(false)} />
            <div className="mt-auto border-t border-white/10 pt-4">
              <p className="truncate text-sm font-medium text-white">
                {identity.displayName}
              </p>
              <p className="mb-3 mt-0.5 text-xs text-[#8fa19a]">{roleLabel}</p>
              <SignOutButton />
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
