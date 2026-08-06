import Link from "next/link";
import { LocalizedText } from "@/components/localization/localized-text";

export function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="border border-[var(--border)] bg-white p-6 sm:p-10">
        <span className="inline-flex rounded bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--brand)]">
          <LocalizedText translationKey="placeholder.futureModule" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
          {title}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
          {description}
        </p>
        <div className="mt-8 border-t border-[var(--border)] pt-6">
          <p className="text-xs leading-5 text-[var(--muted)]">
            <LocalizedText translationKey="placeholder.description" />
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-10 items-center rounded-md bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-strong)]"
          >
            <LocalizedText translationKey="placeholder.returnDashboard" />
          </Link>
        </div>
      </div>
    </div>
  );
}
