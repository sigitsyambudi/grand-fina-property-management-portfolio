"use client";

import { useLocalization } from "./localization-provider";

export function LanguageSelector({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { locale, setLocale, t } = useLocalization();

  if (compact) {
    return (
      <div
        role="group"
        aria-label={t("language.label")}
        className="flex rounded-md border border-[var(--border)] bg-white p-0.5"
      >
        {(["id", "en"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setLocale(option)}
            aria-pressed={locale === option}
            aria-label={t(`language.${option}`)}
            className={`min-h-8 min-w-8 rounded px-1.5 text-[10px] font-semibold transition-colors ${
              locale === option
                ? "bg-[var(--brand)] text-white"
                : "text-[var(--muted)] hover:bg-[var(--surface-subtle)]"
            }`}
          >
            {option.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <label className="flex items-center gap-2">
      <span className={compact ? "sr-only" : "text-xs font-medium text-[var(--muted)]"}>
        {t("language.label")}
      </span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value === "en" ? "en" : "id")}
        aria-label={t("language.label")}
        className="h-10 max-w-48 rounded-md border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--foreground)] focus:border-[var(--brand)]"
      >
        <option value="id">{t("language.id")}</option>
        <option value="en">{t("language.en")}</option>
      </select>
    </label>
  );
}
