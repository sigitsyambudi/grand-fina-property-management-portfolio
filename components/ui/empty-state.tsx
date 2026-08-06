import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-dashed border-[#c9d0cc] bg-white px-5 py-12 text-center sm:px-8 sm:py-14">
      <div
        aria-hidden="true"
        className="mx-auto grid size-10 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none">
          <path
            d="M5 7.5h14M7.5 12h9M10 16.5h4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h2 className="mt-4 text-sm font-semibold text-[var(--foreground)]">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[var(--muted)]">
        {description}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </section>
  );
}
