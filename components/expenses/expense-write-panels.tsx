"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createExpenseAction,
  updateExpenseAction,
  voidExpenseAction,
} from "@/app/(workspace)/expenses/actions";
import {
  formatExpenseCategory,
  formatExpensePaymentMethod,
} from "@/components/expenses/expense-formatters";
import { useLocalization } from "@/components/localization/localization-provider";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type Expense,
  type ExpenseCategory,
  type ExpensePaymentMethod,
} from "@/lib/data/types";
import type { ExpenseMutationResult } from "@/lib/data/expense-write";
import type {
  ExpenseFieldError,
  ExpenseMutationField,
} from "@/lib/data/expense-write-validation";
import type { TranslationKey } from "@/lib/i18n/types";

const INITIAL_STATE: ExpenseMutationResult = { status: "idle" };

export type ExpenseRoomOption = {
  id: string;
  roomNumber: string;
};

const fieldErrorKeys: Record<ExpenseFieldError, TranslationKey> = {
  required: "expenses.validationRequired",
  "invalid-selection": "expenses.validationSelection",
  "invalid-date": "expenses.validationDate",
  "invalid-amount": "expenses.validationAmount",
  "too-long": "expenses.validationTooLong",
};

function FieldError({
  field,
  fieldErrors,
}: {
  field: ExpenseMutationField;
  fieldErrors: Partial<Record<ExpenseMutationField, ExpenseFieldError>>;
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
  field: ExpenseMutationField,
  fieldErrors: Partial<Record<ExpenseMutationField, ExpenseFieldError>>,
): string {
  return `mt-2 min-h-11 w-full rounded-md border bg-white px-3 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[#d7e5de] ${
    fieldErrors[field] ? "border-[#b35a5a]" : "border-[var(--border)]"
  }`;
}

function SubmitButton({
  labelKey,
  pendingKey = "expenses.saving",
  danger = false,
}: {
  labelKey: TranslationKey;
  pendingKey?: TranslationKey;
  danger?: boolean;
}) {
  const { pending } = useFormStatus();
  const { t } = useLocalization();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-10 items-center justify-center rounded-md px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
        danger
          ? "bg-[#8f3535] hover:bg-[#762b2b]"
          : "bg-[var(--brand)] hover:bg-[#123c31]"
      }`}
    >
      {t(pending ? pendingKey : labelKey)}
    </button>
  );
}

function MutationFeedback({
  state,
}: {
  state: ExpenseMutationResult;
}) {
  const { t } = useLocalization();

  if (state.status === "success") {
    const messageKey: TranslationKey =
      state.operation === "create"
        ? "expenses.createSuccess"
        : state.operation === "void"
          ? "expenses.voidSuccess"
          : "expenses.updateSuccess";

    return (
      <div className="mt-4 text-xs font-semibold text-[var(--brand)]" role="status">
        <p>{t(messageKey)}</p>
        {state.operation === "create" ? (
          <Link
            href={`/expenses/${state.expenseId}`}
            className="mt-2 inline-flex underline underline-offset-4"
          >
            {t("expenses.viewCreated")}
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
      ? "expenses.mutationUnauthorized"
      : state.code === "not-found"
        ? "expenses.mutationNotFound"
        : state.code === "invalid-transition"
          ? "expenses.invalidTransition"
          : state.code === "recorded-fields-immutable"
            ? "expenses.recordedImmutable"
            : state.code === "already-void"
              ? "expenses.alreadyVoid"
              : state.code === "unexpected-fields" ||
                  state.code === "invalid-request"
                ? "expenses.validationUnexpected"
                : "expenses.mutationFailed";

  return (
    <p className="mt-4 text-xs font-semibold text-[#9b2c2c]" role="alert">
      {t(messageKey)}
    </p>
  );
}

function ExpenseForm({
  mode,
  expense,
  rooms,
  defaultExpenseDate,
  onCancel,
}: {
  mode: "create" | "edit";
  expense?: Expense;
  rooms: readonly ExpenseRoomOption[];
  defaultExpenseDate: string;
  onCancel: () => void;
}) {
  const { locale, t } = useLocalization();
  const action =
    mode === "edit" && expense
      ? updateExpenseAction.bind(null, expense.id)
      : createExpenseAction;
  const [state, formAction] = useActionState(action, INITIAL_STATE);
  const fieldErrors =
    state.status === "error" && state.fieldErrors ? state.fieldErrors : {};

  return (
    <form
      action={formAction}
      className="border border-[var(--border)] bg-white p-5 sm:p-6"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-sm font-semibold">
            {t(mode === "create" ? "expenses.create" : "expenses.edit")}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {t(
              mode === "create"
                ? "expenses.createDescription"
                : "expenses.editPendingDescription",
            )}
          </p>
        </div>
        <span className="text-xs font-medium text-[var(--muted)]">
          {t("expenses.referenceGenerated")}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-semibold">
          {t("expenses.date")}
          <input
            name="expenseDate"
            type="date"
            defaultValue={expense?.expenseDate ?? defaultExpenseDate}
            aria-invalid={Boolean(fieldErrors.expenseDate)}
            className={inputClasses("expenseDate", fieldErrors)}
          />
          <FieldError field="expenseDate" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold">
          {t("common.category")}
          <select
            name="category"
            defaultValue={expense?.category ?? ""}
            aria-invalid={Boolean(fieldErrors.category)}
            className={inputClasses("category", fieldErrors)}
          >
            <option value="">{t("expenses.selectCategory")}</option>
            {EXPENSE_CATEGORIES.map((category: ExpenseCategory) => (
              <option key={category} value={category}>
                {formatExpenseCategory(category, locale)}
              </option>
            ))}
          </select>
          <FieldError field="category" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold md:col-span-2">
          {t("common.description")}
          <input
            name="description"
            defaultValue={expense?.description ?? ""}
            maxLength={240}
            aria-invalid={Boolean(fieldErrors.description)}
            className={inputClasses("description", fieldErrors)}
          />
          <FieldError field="description" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold">
          {t("common.amount")}
          <input
            name="amount"
            type="number"
            min="1"
            max="1000000000"
            step="1"
            defaultValue={expense?.amount}
            aria-invalid={Boolean(fieldErrors.amount)}
            className={inputClasses("amount", fieldErrors)}
          />
          <FieldError field="amount" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold">
          {t("common.method")}
          <select
            name="paymentMethod"
            defaultValue={expense?.paymentMethod ?? ""}
            aria-invalid={Boolean(fieldErrors.paymentMethod)}
            className={inputClasses("paymentMethod", fieldErrors)}
          >
            <option value="">{t("expenses.selectMethod")}</option>
            {PAYMENT_METHODS.map((method: ExpensePaymentMethod) => (
              <option key={method} value={method}>
                {formatExpensePaymentMethod(method, locale)}
              </option>
            ))}
          </select>
          <FieldError field="paymentMethod" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold">
          {t("common.vendor")}
          <input
            name="vendor"
            defaultValue={expense?.vendor ?? ""}
            maxLength={160}
            aria-invalid={Boolean(fieldErrors.vendor)}
            className={inputClasses("vendor", fieldErrors)}
          />
          <FieldError field="vendor" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold">
          {t("expenses.roomScope")}
          <select
            name="roomId"
            defaultValue={expense?.roomId ?? ""}
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
          {t("common.status")}
          <select
            name="status"
            defaultValue={
              expense?.status === "recorded" ? "recorded" : "pending"
            }
            aria-invalid={Boolean(fieldErrors.status)}
            className={inputClasses("status", fieldErrors)}
          >
            <option value="pending">{t("common.status.pending")}</option>
            <option value="recorded">{t("common.status.recorded")}</option>
          </select>
          <FieldError field="status" fieldErrors={fieldErrors} />
        </label>
      </div>

      <label className="mt-4 block text-xs font-semibold">
        {t("common.notes")}
        <textarea
          name="notes"
          rows={4}
          defaultValue={expense?.notes ?? ""}
          maxLength={1000}
          aria-invalid={Boolean(fieldErrors.notes)}
          className={`${inputClasses("notes", fieldErrors)} py-3`}
        />
        <FieldError field="notes" fieldErrors={fieldErrors} />
      </label>

      <MutationFeedback state={state} />

      <div className="mt-5 flex flex-wrap gap-3">
        <SubmitButton
          labelKey={
            mode === "create" ? "expenses.create" : "expenses.save"
          }
        />
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-10 items-center justify-center border border-[var(--border)] px-4 text-xs font-semibold hover:bg-[#f6f4ef]"
        >
          {t("expenses.cancel")}
        </button>
      </div>
    </form>
  );
}

function RecordedExpenseNotesForm({
  expense,
  onCancel,
}: {
  expense: Expense;
  onCancel: () => void;
}) {
  const { t } = useLocalization();
  const action = updateExpenseAction.bind(null, expense.id);
  const [state, formAction] = useActionState(action, INITIAL_STATE);
  const fieldErrors =
    state.status === "error" && state.fieldErrors ? state.fieldErrors : {};

  return (
    <form
      action={formAction}
      className="border border-[var(--border)] bg-white p-5 sm:p-6"
    >
      <input type="hidden" name="roomId" value={expense.roomId ?? ""} />
      <input type="hidden" name="expenseDate" value={expense.expenseDate} />
      <input type="hidden" name="category" value={expense.category} />
      <input type="hidden" name="description" value={expense.description} />
      <input type="hidden" name="amount" value={expense.amount} />
      <input
        type="hidden"
        name="paymentMethod"
        value={expense.paymentMethod}
      />
      <input type="hidden" name="vendor" value={expense.vendor} />
      <input type="hidden" name="status" value="recorded" />

      <h2 className="text-sm font-semibold">{t("expenses.editNotes")}</h2>
      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
        {t("expenses.recordedImmutableDescription")}
      </p>

      <label className="mt-4 block text-xs font-semibold">
        {t("common.notes")}
        <textarea
          name="notes"
          rows={4}
          defaultValue={expense.notes}
          maxLength={1000}
          aria-invalid={Boolean(fieldErrors.notes)}
          className={`${inputClasses("notes", fieldErrors)} py-3`}
        />
        <FieldError field="notes" fieldErrors={fieldErrors} />
      </label>

      <MutationFeedback state={state} />

      <div className="mt-5 flex flex-wrap gap-3">
        <SubmitButton labelKey="expenses.saveNotes" />
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-10 items-center justify-center border border-[var(--border)] px-4 text-xs font-semibold hover:bg-[#f6f4ef]"
        >
          {t("expenses.cancel")}
        </button>
      </div>
    </form>
  );
}

export function ExpenseCreatePanel({
  canManage,
  rooms,
  defaultExpenseDate,
}: {
  canManage: boolean;
  rooms: readonly ExpenseRoomOption[];
  defaultExpenseDate: string;
}) {
  const { t } = useLocalization();
  const [isCreating, setIsCreating] = useState(false);

  if (!canManage) {
    return (
      <p className="text-xs text-[var(--muted)]">
        {t("expenses.staffReadOnly")}
      </p>
    );
  }

  return isCreating ? (
    <ExpenseForm
      mode="create"
      rooms={rooms}
      defaultExpenseDate={defaultExpenseDate}
      onCancel={() => setIsCreating(false)}
    />
  ) : (
    <button
      type="button"
      onClick={() => setIsCreating(true)}
      className="inline-flex min-h-10 items-center justify-center bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[#123c31]"
    >
      {t("expenses.create")}
    </button>
  );
}

export function ExpenseEditPanel({
  expense,
  canManage,
  rooms,
}: {
  expense: Expense;
  canManage: boolean;
  rooms: readonly ExpenseRoomOption[];
}) {
  const { t } = useLocalization();
  const [isEditing, setIsEditing] = useState(false);

  if (!canManage || expense.status === "void") {
    return null;
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="inline-flex min-h-10 items-center justify-center border border-[var(--brand)] px-4 text-xs font-semibold text-[var(--brand)] hover:bg-[#f0f5f2]"
      >
        {t(
          expense.status === "recorded"
            ? "expenses.editNotes"
            : "expenses.edit",
        )}
      </button>
    );
  }

  return expense.status === "recorded" ? (
    <RecordedExpenseNotesForm
      expense={expense}
      onCancel={() => setIsEditing(false)}
    />
  ) : (
    <ExpenseForm
      mode="edit"
      expense={expense}
      rooms={rooms}
      defaultExpenseDate={expense.expenseDate}
      onCancel={() => setIsEditing(false)}
    />
  );
}

export function ExpenseVoidPanel({
  expense,
  canManage,
}: {
  expense: Expense;
  canManage: boolean;
}) {
  const { t } = useLocalization();
  const [isVoiding, setIsVoiding] = useState(false);
  const action = voidExpenseAction.bind(null, expense.id);
  const [state, formAction] = useActionState(action, INITIAL_STATE);
  const fieldErrors =
    state.status === "error" && state.fieldErrors ? state.fieldErrors : {};

  if (!canManage || expense.status === "void") {
    return null;
  }

  if (!isVoiding) {
    return (
      <button
        type="button"
        onClick={() => setIsVoiding(true)}
        className="inline-flex min-h-10 items-center justify-center border border-[#a75a5a] px-4 text-xs font-semibold text-[#8f3535] hover:bg-[#fff6f6]"
      >
        {t("expenses.void")}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="border border-[#d8b4b4] bg-[#fffafa] p-5 sm:p-6"
    >
      <h2 className="text-sm font-semibold text-[#7d2e2e]">
        {t("expenses.void")}
      </h2>
      <p className="mt-1 text-xs leading-5 text-[#805959]">
        {t("expenses.voidDescription")}
      </p>
      <label className="mt-4 block text-xs font-semibold text-[#552b2b]">
        {t("expenses.voidReason")}
        <textarea
          name="voidReason"
          rows={3}
          maxLength={500}
          aria-invalid={Boolean(fieldErrors.voidReason)}
          className={`${inputClasses("voidReason", fieldErrors)} py-3`}
        />
        <FieldError field="voidReason" fieldErrors={fieldErrors} />
      </label>

      <MutationFeedback state={state} />

      <div className="mt-5 flex flex-wrap gap-3">
        <SubmitButton
          labelKey="expenses.confirmVoid"
          pendingKey="expenses.voiding"
          danger
        />
        <button
          type="button"
          onClick={() => setIsVoiding(false)}
          className="inline-flex min-h-10 items-center justify-center border border-[var(--border)] px-4 text-xs font-semibold hover:bg-white"
        >
          {t("expenses.cancel")}
        </button>
      </div>
    </form>
  );
}
