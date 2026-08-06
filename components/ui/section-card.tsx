import type { ReactNode } from "react";

type SectionCardProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  description,
  action,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <section
      className={`overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] ${className}`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
