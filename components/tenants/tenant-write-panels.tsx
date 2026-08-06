"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useLocalization } from "@/components/localization/localization-provider";
import {
  createTenantAction,
  updateTenantAction,
} from "@/app/(workspace)/tenants/actions";
import type { Tenant } from "@/lib/data/types";
import type { TenantMutationResult } from "@/lib/data/tenant-write";
import type {
  TenantFieldError,
  TenantWriteField,
} from "@/lib/data/tenant-write-validation";
import type { TranslationKey } from "@/lib/i18n/types";

const INITIAL_STATE: TenantMutationResult = { status: "idle" };

type TenantFormValues = Pick<
  Tenant,
  | "fullName"
  | "preferredName"
  | "phone"
  | "email"
  | "occupation"
  | "companyOrInstitution"
  | "emergencyContactName"
  | "emergencyContactPhone"
  | "notes"
>;

const EMPTY_VALUES: TenantFormValues = {
  fullName: "",
  preferredName: null,
  phone: "",
  email: null,
  occupation: null,
  companyOrInstitution: null,
  emergencyContactName: "",
  emergencyContactPhone: "",
  notes: "",
};

const fieldErrorKeys: Record<
  TenantFieldError,
  TranslationKey
> = {
  required: "tenants.validationRequired",
  "too-long": "tenants.validationTooLong",
  "invalid-email": "tenants.validationEmail",
  "invalid-phone": "tenants.validationPhone",
  "emergency-contact-incomplete": "tenants.validationEmergencyContact",
};

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  const { t } = useLocalization();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[#123c31] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? t("tenants.saving")
        : mode === "create"
          ? t("tenants.add")
          : t("tenants.saveChanges")}
    </button>
  );
}

function FieldError({
  field,
  fieldErrors,
}: {
  field: TenantWriteField;
  fieldErrors: Partial<Record<TenantWriteField, TenantFieldError>>;
}) {
  const { t } = useLocalization();
  const error = fieldErrors[field];

  return error ? (
    <span role="alert" className="mt-1 block text-xs font-medium text-[#9b2c2c]">
      {t(fieldErrorKeys[error])}
    </span>
  ) : null;
}

function TenantForm({
  mode,
  tenantId,
  values,
  onCancel,
}: {
  mode: "create" | "edit";
  tenantId?: string;
  values: TenantFormValues;
  onCancel: () => void;
}) {
  const { t } = useLocalization();
  const action = tenantId
    ? updateTenantAction.bind(null, tenantId)
    : createTenantAction;
  const [state, formAction] = useActionState(action, INITIAL_STATE);
  const fieldErrors =
    state.status === "error" && state.fieldErrors ? state.fieldErrors : {};

  function inputClasses(field: TenantWriteField) {
    return `mt-2 min-h-11 w-full rounded-md border px-3 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[#d7e5de] ${
      fieldErrors[field]
        ? "border-[#b35a5a]"
        : "border-[var(--border)]"
    }`;
  }

  return (
    <form action={formAction} className="border border-[var(--border)] bg-white p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-sm font-semibold">
            {t(mode === "create" ? "tenants.add" : "tenants.edit")}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {t(
              mode === "create"
                ? "tenants.createDescription"
                : "tenants.editDescription",
            )}
          </p>
        </div>
        <span className="text-xs font-medium text-[var(--muted)]">
          {t(
            mode === "create"
              ? "tenants.createdPending"
              : "tenants.statusReadOnly",
          )}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-semibold">
          {t("tenants.fullName")}
          <input
            name="fullName"
            autoComplete="name"
            defaultValue={values.fullName}
            aria-invalid={Boolean(fieldErrors.fullName)}
            className={inputClasses("fullName")}
          />
          <FieldError field="fullName" fieldErrors={fieldErrors} />
        </label>
        <label className="block text-xs font-semibold">
          {t("tenants.preferredName")}
          <input
            name="preferredName"
            defaultValue={values.preferredName ?? ""}
            aria-invalid={Boolean(fieldErrors.preferredName)}
            className={inputClasses("preferredName")}
          />
          <FieldError field="preferredName" fieldErrors={fieldErrors} />
        </label>
        <label className="block text-xs font-semibold">
          {t("tenants.phone")}
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={values.phone}
            aria-invalid={Boolean(fieldErrors.phone)}
            className={inputClasses("phone")}
          />
          <FieldError field="phone" fieldErrors={fieldErrors} />
        </label>
        <label className="block text-xs font-semibold">
          {t("tenants.email")}
          <input
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={values.email ?? ""}
            aria-invalid={Boolean(fieldErrors.email)}
            className={inputClasses("email")}
          />
          <FieldError field="email" fieldErrors={fieldErrors} />
        </label>
        <label className="block text-xs font-semibold">
          {t("tenants.occupation")}
          <input
            name="occupation"
            defaultValue={values.occupation ?? ""}
            aria-invalid={Boolean(fieldErrors.occupation)}
            className={inputClasses("occupation")}
          />
          <FieldError field="occupation" fieldErrors={fieldErrors} />
        </label>
        <label className="block text-xs font-semibold">
          {t("tenants.company")}
          <input
            name="companyOrInstitution"
            defaultValue={values.companyOrInstitution ?? ""}
            aria-invalid={Boolean(fieldErrors.companyOrInstitution)}
            className={inputClasses("companyOrInstitution")}
          />
          <FieldError
            field="companyOrInstitution"
            fieldErrors={fieldErrors}
          />
        </label>
        <label className="block text-xs font-semibold">
          {t("tenants.emergencyContactName")}
          <input
            name="emergencyContactName"
            defaultValue={values.emergencyContactName}
            aria-invalid={Boolean(fieldErrors.emergencyContactName)}
            className={inputClasses("emergencyContactName")}
          />
          <FieldError
            field="emergencyContactName"
            fieldErrors={fieldErrors}
          />
        </label>
        <label className="block text-xs font-semibold">
          {t("tenants.emergencyContactPhone")}
          <input
            name="emergencyContactPhone"
            type="tel"
            defaultValue={values.emergencyContactPhone}
            aria-invalid={Boolean(fieldErrors.emergencyContactPhone)}
            className={inputClasses("emergencyContactPhone")}
          />
          <FieldError
            field="emergencyContactPhone"
            fieldErrors={fieldErrors}
          />
        </label>
      </div>

      <label className="mt-4 block text-xs font-semibold">
        {t("common.notes")}
        <textarea
          name="notes"
          rows={4}
          defaultValue={values.notes}
          aria-invalid={Boolean(fieldErrors.notes)}
          className={`${inputClasses("notes")} py-3`}
        />
        <FieldError field="notes" fieldErrors={fieldErrors} />
      </label>

      {state.status === "success" ? (
        <div className="mt-4 text-xs font-semibold text-[var(--brand)]" role="status">
          <p>
            {t(
              mode === "create"
                ? "tenants.createSuccess"
                : "tenants.updateSuccess",
            )}
          </p>
          {mode === "create" ? (
            <Link
              href={`/tenants/${state.tenantId}`}
              className="mt-2 inline-flex underline underline-offset-4"
            >
              {t("tenants.viewCreated")}
            </Link>
          ) : null}
        </div>
      ) : null}
      {state.status === "error" && state.code !== "invalid-fields" ? (
        <p className="mt-4 text-xs font-semibold text-[#9b2c2c]" role="alert">
          {t(
            state.code === "not-authorized"
              ? "tenants.mutationUnauthorized"
              : state.code === "not-found"
                ? "tenants.mutationNotFound"
                : state.code === "unexpected-fields" ||
                    state.code === "invalid-request"
                  ? "tenants.validationUnexpected"
                  : mode === "create"
                    ? "tenants.createFailed"
                    : "tenants.updateFailed",
          )}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <SubmitButton mode={mode} />
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-10 items-center justify-center border border-[var(--border)] px-4 text-xs font-semibold hover:bg-[#f6f4ef]"
        >
          {t("tenants.cancel")}
        </button>
      </div>
    </form>
  );
}

export function TenantCreatePanel({ canManage }: { canManage: boolean }) {
  const { t } = useLocalization();
  const [isCreating, setIsCreating] = useState(false);

  if (!canManage) {
    return null;
  }

  return isCreating ? (
    <TenantForm
      mode="create"
      values={EMPTY_VALUES}
      onCancel={() => setIsCreating(false)}
    />
  ) : (
    <button
      type="button"
      onClick={() => setIsCreating(true)}
      className="inline-flex min-h-10 items-center justify-center bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[#123c31]"
    >
      {t("tenants.add")}
    </button>
  );
}

export function TenantEditPanel({
  tenant,
  canManage,
}: {
  tenant: Tenant;
  canManage: boolean;
}) {
  const { t } = useLocalization();
  const [isEditing, setIsEditing] = useState(false);

  if (!canManage) {
    return (
      <p className="text-xs text-[var(--muted)]">
        {t("tenants.staffReadOnly")}
      </p>
    );
  }

  return isEditing ? (
    <TenantForm
      mode="edit"
      tenantId={tenant.id}
      values={tenant}
      onCancel={() => setIsEditing(false)}
    />
  ) : (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="inline-flex min-h-10 items-center justify-center border border-[var(--brand)] px-4 text-xs font-semibold text-[var(--brand)] hover:bg-[#f0f5f2]"
    >
      {t("tenants.edit")}
    </button>
  );
}
