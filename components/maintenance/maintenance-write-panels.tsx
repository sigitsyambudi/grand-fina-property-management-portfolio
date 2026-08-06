"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createMaintenanceAction,
  updateMaintenanceAction,
} from "@/app/(workspace)/maintenance/actions";
import { useLocalization } from "@/components/localization/localization-provider";
import {
  formatMaintenanceCategory,
  formatMaintenancePriority,
  formatMaintenanceStatus,
} from "@/components/maintenance/maintenance-formatters";
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
  type MaintenanceRecord,
  type MaintenanceStatus,
} from "@/lib/data/types";
import type { MaintenanceMutationResult } from "@/lib/data/maintenance-write";
import type {
  MaintenanceFieldError,
  MaintenanceMutationField,
} from "@/lib/data/maintenance-write-validation";
import type { TranslationKey } from "@/lib/i18n/types";

const INITIAL_STATE: MaintenanceMutationResult = { status: "idle" };

export type MaintenanceRoomOption = {
  id: string;
  roomNumber: string;
};

const fieldErrorKeys: Record<MaintenanceFieldError, TranslationKey> = {
  required: "maintenance.validationRequired",
  "invalid-selection": "maintenance.validationSelection",
  "invalid-date": "maintenance.validationDate",
  "date-order": "maintenance.validationDateOrder",
  "invalid-cost": "maintenance.validationCost",
  "too-long": "maintenance.validationTooLong",
  "completion-required": "maintenance.validationCompletionDate",
  "completion-only": "maintenance.validationCompletionOnly",
  "cancellation-note-required": "maintenance.validationCancellationNote",
};

function FieldError({
  field,
  fieldErrors,
}: {
  field: MaintenanceMutationField;
  fieldErrors: Partial<
    Record<MaintenanceMutationField, MaintenanceFieldError>
  >;
}) {
  const { t } = useLocalization();
  const error = fieldErrors[field];

  return error ? (
    <span role="alert" className="mt-1 block text-xs font-medium text-[#9b2c2c]">
      {t(fieldErrorKeys[error])}
    </span>
  ) : null;
}

function inputClasses(
  field: MaintenanceMutationField,
  fieldErrors: Partial<
    Record<MaintenanceMutationField, MaintenanceFieldError>
  >,
): string {
  return `mt-2 min-h-11 w-full rounded-md border bg-white px-3 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[#d7e5de] ${
    fieldErrors[field] ? "border-[#b35a5a]" : "border-[var(--border)]"
  }`;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useLocalization();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[#123c31] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {t(pending ? "maintenance.saving" : "maintenance.save")}
    </button>
  );
}

function MutationFeedback({ state }: { state: MaintenanceMutationResult }) {
  const { t } = useLocalization();

  if (state.status === "success") {
    const successKey: TranslationKey =
      state.operation === "create"
        ? "maintenance.createSuccess"
        : state.operation === "complete"
          ? "maintenance.completeSuccess"
          : state.operation === "cancel"
            ? "maintenance.cancelSuccess"
            : "maintenance.updateSuccess";

    return (
      <div className="mt-4 text-xs font-semibold text-[var(--brand)]" role="status">
        <p>{t(successKey)}</p>
        {state.operation === "create" ? (
          <Link
            href={`/maintenance/${state.maintenanceReference}`}
            className="mt-2 inline-flex underline underline-offset-4"
          >
            {t("maintenance.viewCreated")}
          </Link>
        ) : null}
      </div>
    );
  }

  if (state.status !== "error" || state.code === "invalid-fields") {
    return null;
  }

  const errorKey: TranslationKey =
    state.code === "not-authorized"
      ? "maintenance.mutationUnauthorized"
      : state.code === "not-found"
        ? "maintenance.mutationNotFound"
        : state.code === "invalid-transition"
          ? "maintenance.invalidTransition"
          : state.code === "already-closed"
            ? "maintenance.alreadyClosed"
            : state.code === "unexpected-fields" ||
                state.code === "invalid-request"
              ? "maintenance.validationUnexpected"
              : "maintenance.mutationFailed";

  return (
    <p className="mt-4 text-xs font-semibold text-[#9b2c2c]" role="alert">
      {t(errorKey)}
    </p>
  );
}

function MaintenanceForm({
  mode,
  record,
  rooms,
  defaultReportedDate,
  onCancel,
}: {
  mode: "create" | "edit";
  record?: MaintenanceRecord;
  rooms: readonly MaintenanceRoomOption[];
  defaultReportedDate: string;
  onCancel: () => void;
}) {
  const { locale, t } = useLocalization();
  const action =
    mode === "edit" && record
      ? updateMaintenanceAction.bind(null, record.id)
      : createMaintenanceAction;
  const [state, formAction] = useActionState(action, INITIAL_STATE);
  const fieldErrors =
    state.status === "error" && state.fieldErrors ? state.fieldErrors : {};
  const statusOptions: readonly MaintenanceStatus[] =
    record?.status === "in_progress"
      ? ["in_progress", "completed", "cancelled"]
      : ["open", "in_progress", "completed", "cancelled"];

  return (
    <form
      action={formAction}
      className="border border-[var(--border)] bg-white p-5 sm:p-6"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-sm font-semibold">
            {t(mode === "create" ? "maintenance.create" : "maintenance.edit")}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {t(
              mode === "create"
                ? "maintenance.createDescription"
                : "maintenance.editDescription",
            )}
          </p>
        </div>
        <span className="text-xs font-medium text-[var(--muted)]">
          {t("maintenance.referenceGenerated")}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-semibold md:col-span-2">
          {t("maintenance.issue")}
          <input
            name="title"
            defaultValue={record?.title ?? ""}
            maxLength={160}
            aria-invalid={Boolean(fieldErrors.title)}
            className={inputClasses("title", fieldErrors)}
          />
          <FieldError field="title" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold md:col-span-2">
          {t("common.description")}
          <textarea
            name="description"
            rows={4}
            defaultValue={record?.description ?? ""}
            maxLength={2000}
            aria-invalid={Boolean(fieldErrors.description)}
            className={`${inputClasses("description", fieldErrors)} py-3`}
          />
          <FieldError field="description" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold">
          {t("common.category")}
          <select
            name="category"
            defaultValue={record?.category ?? ""}
            aria-invalid={Boolean(fieldErrors.category)}
            className={inputClasses("category", fieldErrors)}
          >
            <option value="">{t("maintenance.selectCategory")}</option>
            {MAINTENANCE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {formatMaintenanceCategory(category, locale)}
              </option>
            ))}
          </select>
          <FieldError field="category" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold">
          {t("maintenance.priority")}
          <select
            name="priority"
            defaultValue={record?.priority ?? "medium"}
            aria-invalid={Boolean(fieldErrors.priority)}
            className={inputClasses("priority", fieldErrors)}
          >
            {MAINTENANCE_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {formatMaintenancePriority(priority, locale)}
              </option>
            ))}
          </select>
          <FieldError field="priority" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold">
          {t("maintenance.roomScope")}
          <select
            name="roomId"
            defaultValue={record?.roomId ?? ""}
            aria-invalid={Boolean(fieldErrors.roomId)}
            className={inputClasses("roomId", fieldErrors)}
          >
            <option value="">{t("common.propertyWide")}</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {t("common.roomNumber", { number: room.roomNumber })}
              </option>
            ))}
          </select>
          <FieldError field="roomId" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold">
          {t("common.vendor")}
          <input
            name="vendor"
            defaultValue={record?.vendor ?? ""}
            maxLength={160}
            aria-invalid={Boolean(fieldErrors.vendor)}
            className={inputClasses("vendor", fieldErrors)}
          />
          <FieldError field="vendor" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold">
          {t("maintenance.reported")}
          <input
            name="reportedDate"
            type="date"
            defaultValue={record?.reportedDate ?? defaultReportedDate}
            aria-invalid={Boolean(fieldErrors.reportedDate)}
            className={inputClasses("reportedDate", fieldErrors)}
          />
          <FieldError field="reportedDate" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold">
          {t("maintenance.scheduled")}
          <input
            name="scheduledDate"
            type="date"
            defaultValue={record?.scheduledDate ?? ""}
            aria-invalid={Boolean(fieldErrors.scheduledDate)}
            className={inputClasses("scheduledDate", fieldErrors)}
          />
          <FieldError field="scheduledDate" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold">
          {t("maintenance.estimatedCost")}
          <input
            name="estimatedCost"
            type="number"
            min="0"
            max="1000000000"
            step="1"
            defaultValue={record?.estimatedCost ?? ""}
            aria-invalid={Boolean(fieldErrors.estimatedCost)}
            className={inputClasses("estimatedCost", fieldErrors)}
          />
          <FieldError field="estimatedCost" fieldErrors={fieldErrors} />
        </label>

        {mode === "create" ? (
          <input type="hidden" name="status" value="open" />
        ) : (
          <label className="block text-xs font-semibold">
            {t("common.status")}
            <select
              name="status"
              defaultValue={record?.status}
              aria-invalid={Boolean(fieldErrors.status)}
              className={inputClasses("status", fieldErrors)}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatMaintenanceStatus(status, locale)}
                </option>
              ))}
            </select>
            <FieldError field="status" fieldErrors={fieldErrors} />
          </label>
        )}
      </div>

      {mode === "edit" ? (
        <div className="mt-5 border-t border-[var(--border)] pt-5">
          <p className="text-xs font-semibold">
            {t("maintenance.completionFields")}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">
            {t("maintenance.completionHint")}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-semibold">
              {t("maintenance.completed")}
              <input
                name="completedDate"
                type="date"
                defaultValue={record?.completedDate ?? ""}
                aria-invalid={Boolean(fieldErrors.completedDate)}
                className={inputClasses("completedDate", fieldErrors)}
              />
              <FieldError field="completedDate" fieldErrors={fieldErrors} />
            </label>
            <label className="block text-xs font-semibold">
              {t("maintenance.actualCost")}
              <input
                name="actualCost"
                type="number"
                min="0"
                max="1000000000"
                step="1"
                defaultValue={record?.actualCost ?? ""}
                aria-invalid={Boolean(fieldErrors.actualCost)}
                className={inputClasses("actualCost", fieldErrors)}
              />
              <FieldError field="actualCost" fieldErrors={fieldErrors} />
            </label>
            <label className="block text-xs font-semibold md:col-span-2">
              {t("maintenance.resolution")}
              <textarea
                name="resolution"
                rows={3}
                defaultValue={record?.resolution ?? ""}
                maxLength={2000}
                aria-invalid={Boolean(fieldErrors.resolution)}
                className={`${inputClasses("resolution", fieldErrors)} py-3`}
              />
              <FieldError field="resolution" fieldErrors={fieldErrors} />
            </label>
          </div>
        </div>
      ) : null}

      <label className="mt-4 block text-xs font-semibold">
        {t("common.notes")}
        <textarea
          name="notes"
          rows={4}
          defaultValue={record?.notes ?? ""}
          maxLength={2000}
          aria-invalid={Boolean(fieldErrors.notes)}
          className={`${inputClasses("notes", fieldErrors)} py-3`}
        />
        <FieldError field="notes" fieldErrors={fieldErrors} />
      </label>

      <MutationFeedback state={state} />

      <div className="mt-5 flex flex-wrap gap-3">
        <SubmitButton />
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-10 items-center justify-center border border-[var(--border)] px-4 text-xs font-semibold hover:bg-[#f6f4ef]"
        >
          {t("maintenance.cancel")}
        </button>
      </div>
    </form>
  );
}

export function MaintenanceCreatePanel({
  canManage,
  rooms,
  defaultReportedDate,
}: {
  canManage: boolean;
  rooms: readonly MaintenanceRoomOption[];
  defaultReportedDate: string;
}) {
  const { t } = useLocalization();
  const [isCreating, setIsCreating] = useState(false);

  if (!canManage) {
    return (
      <p className="text-xs text-[var(--muted)]">
        {t("maintenance.staffReadOnly")}
      </p>
    );
  }

  return isCreating ? (
    <MaintenanceForm
      mode="create"
      rooms={rooms}
      defaultReportedDate={defaultReportedDate}
      onCancel={() => setIsCreating(false)}
    />
  ) : (
    <button
      type="button"
      onClick={() => setIsCreating(true)}
      className="inline-flex min-h-10 items-center justify-center bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[#123c31]"
    >
      {t("maintenance.create")}
    </button>
  );
}

export function MaintenanceEditPanel({
  record,
  canManage,
  rooms,
}: {
  record: MaintenanceRecord;
  canManage: boolean;
  rooms: readonly MaintenanceRoomOption[];
}) {
  const { t } = useLocalization();
  const [isEditing, setIsEditing] = useState(false);

  if (
    !canManage ||
    record.status === "completed" ||
    record.status === "cancelled"
  ) {
    return null;
  }

  return isEditing ? (
    <MaintenanceForm
      mode="edit"
      record={record}
      rooms={rooms}
      defaultReportedDate={record.reportedDate}
      onCancel={() => setIsEditing(false)}
    />
  ) : (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="inline-flex min-h-10 items-center justify-center border border-[var(--brand)] px-4 text-xs font-semibold text-[var(--brand)] hover:bg-[#f0f5f2]"
    >
      {t("maintenance.edit")}
    </button>
  );
}
