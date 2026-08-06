"use client";

import { useFormStatus } from "react-dom";
import { signOutAction } from "@/app/auth-actions";
import { useLocalization } from "@/components/localization/localization-provider";

function SignOutLabel() {
  const { pending } = useFormStatus();
  const { t } = useLocalization();

  return pending ? t("auth.signingOut") : t("auth.signOut");
}

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className={
          compact
            ? "rounded-md border border-[var(--border)] bg-white px-2.5 py-2 text-xs font-semibold text-[var(--brand)] hover:bg-[var(--surface-subtle)]"
            : "inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--brand)] hover:bg-[var(--surface-subtle)]"
        }
      >
        <SignOutLabel />
      </button>
    </form>
  );
}
