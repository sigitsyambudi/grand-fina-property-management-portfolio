"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  signInAction,
  type LoginState,
} from "@/app/login/actions";
import { useLocalization } from "@/components/localization/localization-provider";

const initialState: LoginState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useLocalization();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[var(--brand)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-strong)] disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? t("auth.signingIn") : t("auth.signIn")}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(signInAction, initialState);
  const { t } = useLocalization();
  const errorMessage =
    state.error === "invalid-input"
      ? t("auth.invalidInput")
      : state.error === "invalid-credentials"
        ? t("auth.invalidCredentials")
        : state.error === "unexpected"
          ? t("auth.unexpectedError")
          : null;

  return (
    <div className="w-full max-w-md">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
        {t("auth.internalAccess")}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-[var(--foreground)]">
        {t("auth.signInTitle")}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        {t("auth.signInDescription")}
      </p>

      <form action={action} className="mt-8 space-y-5" noValidate>
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-[var(--foreground)]"
          >
            {t("auth.email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            required
            maxLength={254}
            aria-describedby={errorMessage ? "login-error" : undefined}
            className="h-11 w-full rounded-md border border-[var(--border)] bg-white px-3.5 text-sm text-[var(--foreground)] shadow-sm outline-none placeholder:text-[#9aa39f] focus:border-[var(--brand)] focus:ring-2 focus:ring-[#d7e5de]"
            placeholder="name@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-[var(--foreground)]"
          >
            {t("auth.password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            maxLength={128}
            aria-describedby={errorMessage ? "login-error" : undefined}
            className="h-11 w-full rounded-md border border-[var(--border)] bg-white px-3.5 text-sm text-[var(--foreground)] shadow-sm outline-none placeholder:text-[#9aa39f] focus:border-[var(--brand)] focus:ring-2 focus:ring-[#d7e5de]"
          />
        </div>

        {errorMessage ? (
          <p
            id="login-error"
            role="alert"
            className="rounded-md border border-[#e5c6c4] bg-[#fff7f6] px-3 py-2.5 text-sm text-[var(--danger)]"
          >
            {errorMessage}
          </p>
        ) : null}

        <SubmitButton />
      </form>

      <p className="mt-6 border-t border-[var(--border)] pt-5 text-xs leading-5 text-[var(--muted)]">
        {t("auth.noPublicRegistration")}
      </p>
    </div>
  );
}
