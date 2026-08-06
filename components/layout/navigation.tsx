"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocalization } from "@/components/localization/localization-provider";
import type { TranslationKey } from "@/lib/i18n/types";

type NavigationProps = {
  onNavigate?: () => void;
};

const primaryItems = [
  { labelKey: "navigation.dashboard", href: "/", marker: "DA" },
  { labelKey: "navigation.rooms", href: "/rooms", marker: "RO" },
  { labelKey: "navigation.tenants", href: "/tenants", marker: "TE" },
  { labelKey: "navigation.leases", href: "/leases", marker: "LE" },
  { labelKey: "navigation.invoices", href: "/invoices", marker: "IN" },
  { labelKey: "navigation.payments", href: "/payments", marker: "PA" },
  { labelKey: "navigation.expenses", href: "/expenses", marker: "EX" },
  { labelKey: "navigation.maintenance", href: "/maintenance", marker: "MA" },
  { labelKey: "navigation.reports", href: "/reports", marker: "RE" },
] as const;

const secondaryItems = [
  { labelKey: "navigation.settings", href: "/settings", marker: "SE" },
  { labelKey: "navigation.about", href: "/about", marker: "info" },
] as const;

function CircleInfoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function NavLink({
  href,
  labelKey,
  marker,
  onNavigate,
}: {
  href: string;
  labelKey: TranslationKey;
  marker: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useLocalization();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={`group flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
        isActive
          ? "bg-white/10 text-white"
          : "text-[#bfcac6] hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <span
        aria-hidden="true"
        className={`grid size-7 place-items-center rounded border text-[9px] font-semibold tracking-[0.08em] ${
          isActive
            ? "border-[#b08a4a]/70 bg-[#b08a4a]/15 text-[#e8cf9e]"
            : "border-white/10 text-[#8fa19a] group-hover:border-white/20"
        }`}
      >
        {marker === "info" ? <CircleInfoIcon /> : marker}
      </span>
      <span>{t(labelKey)}</span>
    </Link>
  );
}

export function Navigation({ onNavigate }: NavigationProps) {
  const { t } = useLocalization();

  return (
    <nav
      aria-label={t("shell.primaryNavigation")}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="space-y-1">
        {primaryItems.map((item) => (
          <NavLink key={item.href} {...item} onNavigate={onNavigate} />
        ))}
      </div>
      <div className="mt-auto border-t border-white/10 pt-4">
        {secondaryItems.map((item) => (
          <NavLink key={item.href} {...item} onNavigate={onNavigate} />
        ))}
      </div>
    </nav>
  );
}
