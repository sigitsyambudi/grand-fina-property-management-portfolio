"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createLeaseAction,
  updateLeaseAction,
} from "@/app/(workspace)/leases/actions";
import { useLocalization } from "@/components/localization/localization-provider";
import { formatIdr } from "@/components/rooms/room-formatters";
import type { Lease } from "@/lib/data/types";
import type { LeaseMutationResult } from "@/lib/data/lease-write";
import type {
  LeaseFieldError,
  LeaseWriteField,
} from "@/lib/data/lease-write-validation";
import type { TranslationKey } from "@/lib/i18n/types";
import { formatDisplayValue } from "@/lib/i18n/display-values";

const INITIAL_STATE: LeaseMutationResult = { status: "idle" };

export type EligibleLeaseTenant = {
  id: string;
  fullName: string;
};

export type EligibleLeaseRoom = {
  id: string;
  roomNumber: string;
  location: string;
  monthlyRate: number;
};

const fieldErrorKeys: Record<LeaseFieldError, TranslationKey> = {
  required: "leases.validationRequired",
  "invalid-selection": "leases.validationSelection",
  "invalid-date": "leases.validationDate",
  "invalid-date-range": "leases.validationDateRange",
  "invalid-billing-day": "leases.validationBillingDay",
  "invalid-rent": "leases.validationRent",
  "too-long": "leases.validationTooLong",
};

function FieldError({
  field,
  fieldErrors,
}: {
  field: LeaseWriteField;
  fieldErrors: Partial<Record<LeaseWriteField, LeaseFieldError>>;
}) {
  const { t } = useLocalization();
  const error = fieldErrors[field];

  return error ? (
    <span role="alert" className="mt-1 block text-xs font-medium text-[#9b2c2c]">
      {t(fieldErrorKeys[error])}
    </span>
  ) : null;
}

function SubmitButton({
  mode,
  disabled = false,
}: {
  mode: "create" | "edit";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const { t } = useLocalization();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[#123c31] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? t("leases.saving")
        : mode === "create"
          ? t("leases.create")
          : t("leases.save")}
    </button>
  );
}

function MutationFeedback({
  state,
  mode,
}: {
  state: LeaseMutationResult;
  mode: "create" | "edit";
}) {
  const { t } = useLocalization();

  if (state.status === "success") {
    return (
      <div className="mt-4 text-xs font-semibold text-[var(--brand)]" role="status">
        <p>
          {t(
            mode === "create"
              ? "leases.createSuccess"
              : "leases.updateSuccess",
          )}
        </p>
        {mode === "create" ? (
          <Link
            href={`/leases/${state.leaseId}`}
            className="mt-2 inline-flex underline underline-offset-4"
          >
            {t("leases.viewCreated")}
          </Link>
        ) : null}
      </div>
    );
  }

  if (state.status !== "error" || state.code === "invalid-fields") {
    return null;
  }

  const messageKey: TranslationKey =
    state.code === "not-authorized"
      ? "leases.mutationUnauthorized"
      : state.code === "not-found"
        ? "leases.mutationNotFound"
        : state.code === "tenant-unavailable"
          ? "leases.tenantUnavailable"
          : state.code === "room-unavailable"
            ? "leases.roomUnavailable"
            : state.code === "conflict"
              ? "leases.conflict"
              : state.code === "unexpected-fields" ||
                  state.code === "invalid-request"
                ? "leases.validationUnexpected"
                : mode === "create"
                  ? "leases.createFailed"
                  : "leases.updateFailed";

  return (
    <p className="mt-4 text-xs font-semibold text-[#9b2c2c]" role="alert">
      {t(messageKey)}
    </p>
  );
}

function inputClasses(
  field: LeaseWriteField,
  fieldErrors: Partial<Record<LeaseWriteField, LeaseFieldError>>,
) {
  return `mt-2 min-h-11 w-full rounded-md border bg-white px-3 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[#d7e5de] ${
    fieldErrors[field]
      ? "border-[#b35a5a]"
      : "border-[var(--border)]"
  }`;
}

function LeaseTermsFields({
  values,
  fieldErrors,
  monthlyRent,
  onMonthlyRentChange,
}: {
  values: {
    startDate: string;
    endDate: string;
    billingDay: number | string;
    notes: string;
  };
  fieldErrors: Partial<Record<LeaseWriteField, LeaseFieldError>>;
  monthlyRent: string;
  onMonthlyRentChange?: (value: string) => void;
}) {
  const { t } = useLocalization();

  return (
    <>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-semibold">
          {t("leases.startDate")}
          <input
            name="startDate"
            type="date"
            defaultValue={values.startDate}
            aria-invalid={Boolean(fieldErrors.startDate)}
            className={inputClasses("startDate", fieldErrors)}
          />
          <FieldError field="startDate" fieldErrors={fieldErrors} />
        </label>
        <label className="block text-xs font-semibold">
          {t("leases.endDate")}
          <input
            name="endDate"
            type="date"
            defaultValue={values.endDate}
            aria-invalid={Boolean(fieldErrors.endDate)}
            className={inputClasses("endDate", fieldErrors)}
          />
          <FieldError field="endDate" fieldErrors={fieldErrors} />
        </label>
        <label className="block text-xs font-semibold">
          {t("leases.billingDay")}
          <input
            name="billingDay"
            type="number"
            min="1"
            max="28"
            step="1"
            defaultValue={values.billingDay}
            aria-invalid={Boolean(fieldErrors.billingDay)}
            className={inputClasses("billingDay", fieldErrors)}
          />
          <FieldError field="billingDay" fieldErrors={fieldErrors} />
        </label>
        <label className="block text-xs font-semibold">
          {t("common.monthlyRent")}
          <input
            name="monthlyRent"
            type="number"
            min="1"
            max="1000000000"
            step="1"
            value={monthlyRent}
            onChange={
              onMonthlyRentChange
                ? (event) => onMonthlyRentChange(event.target.value)
                : undefined
            }
            readOnly={!onMonthlyRentChange}
            aria-invalid={Boolean(fieldErrors.monthlyRent)}
            className={inputClasses("monthlyRent", fieldErrors)}
          />
          <FieldError field="monthlyRent" fieldErrors={fieldErrors} />
        </label>
      </div>

      <label className="mt-4 block text-xs font-semibold">
        {t("common.notes")}
        <textarea
          name="notes"
          rows={4}
          defaultValue={values.notes}
          placeholder={t("leases.notesHint")}
          aria-invalid={Boolean(fieldErrors.notes)}
          className={`${inputClasses("notes", fieldErrors)} py-3`}
        />
        <FieldError field="notes" fieldErrors={fieldErrors} />
      </label>
    </>
  );
}

function CreateLeaseForm({
  tenants,
  rooms,
  onCancel,
}: {
  tenants: readonly EligibleLeaseTenant[];
  rooms: readonly EligibleLeaseRoom[];
  onCancel: () => void;
}) {
  const { locale, t } = useLocalization();
  const [state, formAction] = useActionState(
    createLeaseAction,
    INITIAL_STATE,
  );
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const fieldErrors =
    state.status === "error" && state.fieldErrors ? state.fieldErrors : {};
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
  const hasEligibleRelationship = tenants.length > 0 && rooms.length > 0;

  function selectRoom(roomId: string) {
    setSelectedRoomId(roomId);
    const room = rooms.find((candidate) => candidate.id === roomId);
    setMonthlyRent(room ? room.monthlyRate.toString() : "");
  }

  return (
    <form action={formAction} className="border border-[var(--border)] bg-white p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-sm font-semibold">{t("leases.create")}</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {t("leases.createDescription")}
          </p>
        </div>
        <span className="text-xs font-medium text-[var(--muted)]">
          {t("leases.activeOnly")}
        </span>
      </div>

      {!hasEligibleRelationship ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {tenants.length === 0 ? (
            <div className="border border-dashed border-[var(--border)] p-4">
              <p className="text-xs font-semibold">
                {t("leases.noEligibleTenant")}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                {t("leases.noEligibleTenantHint")}
              </p>
            </div>
          ) : null}
          {rooms.length === 0 ? (
            <div className="border border-dashed border-[var(--border)] p-4">
              <p className="text-xs font-semibold">
                {t("leases.noAvailableRoom")}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                {t("leases.noAvailableRoomHint")}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-semibold">
              {t("common.tenant")}
              <select
                name="tenantId"
                defaultValue=""
                aria-invalid={Boolean(fieldErrors.tenantId)}
                className={inputClasses("tenantId", fieldErrors)}
              >
                <option value="">{t("leases.selectTenant")}</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.fullName}
                  </option>
                ))}
              </select>
              <FieldError field="tenantId" fieldErrors={fieldErrors} />
            </label>
            <label className="block text-xs font-semibold">
              {t("common.room")}
              <select
                name="roomId"
                value={selectedRoomId}
                onChange={(event) => selectRoom(event.target.value)}
                aria-invalid={Boolean(fieldErrors.roomId)}
                className={inputClasses("roomId", fieldErrors)}
              >
                <option value="">{t("leases.selectRoom")}</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {t("common.roomNumber", { number: room.roomNumber })} -{" "}
                    {formatDisplayValue(room.location, locale)}
                  </option>
                ))}
              </select>
              <FieldError field="roomId" fieldErrors={fieldErrors} />
              {selectedRoom ? (
                <span className="mt-1 block text-[11px] text-[var(--muted)]">
                  {t("leases.currentRoomRate", {
                    amount: formatIdr(selectedRoom.monthlyRate),
                  })}
                </span>
              ) : null}
            </label>
          </div>

          <LeaseTermsFields
            values={{
              startDate: "",
              endDate: "",
              billingDay: 1,
              notes: "",
            }}
            fieldErrors={fieldErrors}
            monthlyRent={monthlyRent}
            onMonthlyRentChange={setMonthlyRent}
          />
        </>
      )}

      <MutationFeedback state={state} mode="create" />

      <div className="mt-5 flex flex-wrap gap-3">
        <SubmitButton
          mode="create"
          disabled={!hasEligibleRelationship}
        />
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-10 items-center justify-center border border-[var(--border)] px-4 text-xs font-semibold hover:bg-[#f6f4ef]"
        >
          {t("leases.cancel")}
        </button>
      </div>
    </form>
  );
}

export function LeaseCreatePanel({
  canManage,
  tenants,
  rooms,
}: {
  canManage: boolean;
  tenants: readonly EligibleLeaseTenant[];
  rooms: readonly EligibleLeaseRoom[];
}) {
  const { t } = useLocalization();
  const [isCreating, setIsCreating] = useState(false);

  if (!canManage) {
    return null;
  }

  return isCreating ? (
    <CreateLeaseForm
      tenants={tenants}
      rooms={rooms}
      onCancel={() => setIsCreating(false)}
    />
  ) : (
    <button
      type="button"
      onClick={() => setIsCreating(true)}
      className="inline-flex min-h-10 items-center justify-center bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[#123c31]"
    >
      {t("leases.create")}
    </button>
  );
}

function EditLeaseForm({
  lease,
  onCancel,
}: {
  lease: Lease;
  onCancel: () => void;
}) {
  const { t } = useLocalization();
  const action = updateLeaseAction.bind(null, lease.id);
  const [state, formAction] = useActionState(action, INITIAL_STATE);
  const [monthlyRent, setMonthlyRent] = useState(
    lease.monthlyRent.toString(),
  );
  const fieldErrors =
    state.status === "error" && state.fieldErrors ? state.fieldErrors : {};

  return (
    <form action={formAction} className="border border-[var(--border)] bg-white p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-sm font-semibold">{t("leases.edit")}</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {t("leases.editDescription")}
          </p>
        </div>
        <span className="text-xs font-medium text-[var(--muted)]">
          {t("leases.relationshipImmutable")}
        </span>
      </div>

      <LeaseTermsFields
        values={{
          startDate: lease.startDate,
          endDate: lease.endDate,
          billingDay: lease.billingDay,
          notes: lease.notes,
        }}
        fieldErrors={fieldErrors}
        monthlyRent={monthlyRent}
        onMonthlyRentChange={setMonthlyRent}
      />

      <MutationFeedback state={state} mode="edit" />

      <div className="mt-5 flex flex-wrap gap-3">
        <SubmitButton mode="edit" />
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-10 items-center justify-center border border-[var(--border)] px-4 text-xs font-semibold hover:bg-[#f6f4ef]"
        >
          {t("leases.cancel")}
        </button>
      </div>
    </form>
  );
}

export function LeaseEditPanel({
  lease,
  canManage,
}: {
  lease: Lease;
  canManage: boolean;
}) {
  const { t } = useLocalization();
  const [isEditing, setIsEditing] = useState(false);

  if (!canManage) {
    return (
      <p className="text-xs text-[var(--muted)]">
        {t("leases.staffReadOnly")}
      </p>
    );
  }

  return isEditing ? (
    <EditLeaseForm
      lease={lease}
      onCancel={() => setIsEditing(false)}
    />
  ) : (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="inline-flex min-h-10 items-center justify-center border border-[var(--brand)] px-4 text-xs font-semibold text-[var(--brand)] hover:bg-[#f0f5f2]"
    >
      {t("leases.edit")}
    </button>
  );
}
