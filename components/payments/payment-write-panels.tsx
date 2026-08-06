"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createPaymentAction,
  updatePaymentNotesAction,
} from "@/app/(workspace)/payments/actions";
import { formatBillingPeriod } from "@/components/invoices/invoice-formatters";
import { useLocalization } from "@/components/localization/localization-provider";
import { formatPaymentMethod } from "@/components/payments/payment-formatters";
import { formatIdr } from "@/components/rooms/room-formatters";
import {
  PAYMENT_METHODS,
  type Payment,
  type PaymentMethod,
} from "@/lib/data/types";
import type { PaymentMutationResult } from "@/lib/data/payment-write";
import type {
  PaymentFieldError,
  PaymentWriteField,
} from "@/lib/data/payment-write-validation";
import type { TranslationKey } from "@/lib/i18n/types";

const INITIAL_STATE: PaymentMutationResult = { status: "idle" };

export type OutstandingInvoiceOption = {
  id: string;
  reference: string;
  billingPeriod: string;
  amount: number;
  paidAmount: number;
  remainingBalance: number;
  tenantName: string;
  roomNumber: string;
};

const fieldErrorKeys: Record<PaymentFieldError, TranslationKey> = {
  required: "payments.validationRequired",
  "invalid-selection": "payments.validationSelection",
  "invalid-date": "payments.validationDate",
  "invalid-amount": "payments.validationAmount",
  "too-long": "payments.validationTooLong",
};

function FieldError({
  field,
  fieldErrors,
}: {
  field: PaymentWriteField;
  fieldErrors: Partial<Record<PaymentWriteField, PaymentFieldError>>;
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
  field: PaymentWriteField,
  fieldErrors: Partial<Record<PaymentWriteField, PaymentFieldError>>,
): string {
  return `mt-2 min-h-11 w-full rounded-md border bg-white px-3 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[#d7e5de] ${
    fieldErrors[field] ? "border-[#b35a5a]" : "border-[var(--border)]"
  }`;
}

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
        ? t("payments.saving")
        : mode === "create"
          ? t("payments.record")
          : t("payments.saveNotes")}
    </button>
  );
}

function MutationFeedback({
  state,
  mode,
}: {
  state: PaymentMutationResult;
  mode: "create" | "edit";
}) {
  const { t } = useLocalization();

  if (state.status === "success") {
    return (
      <div className="mt-4 text-xs font-semibold text-[var(--brand)]" role="status">
        <p>
          {t(
            mode === "create"
              ? "payments.recordSuccess"
              : "payments.updateSuccess",
          )}
        </p>
        {mode === "create" ? (
          <Link
            href={`/payments/${state.paymentId}`}
            className="mt-2 inline-flex underline underline-offset-4"
          >
            {t("payments.viewRecorded")}
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
      ? "payments.mutationUnauthorized"
      : state.code === "not-found"
        ? "payments.mutationNotFound"
        : state.code === "invoice-paid"
          ? "payments.invoicePaid"
          : state.code === "amount-exceeds-balance"
            ? "payments.amountExceedsBalance"
            : state.code === "unexpected-fields" ||
                state.code === "invalid-request"
              ? "payments.validationUnexpected"
              : mode === "create"
                ? "payments.recordFailed"
                : "payments.updateFailed";

  return (
    <p className="mt-4 text-xs font-semibold text-[#9b2c2c]" role="alert">
      {t(messageKey)}
    </p>
  );
}

function CreatePaymentForm({
  invoices,
  defaultPaymentDate,
  onCancel,
}: {
  invoices: readonly OutstandingInvoiceOption[];
  defaultPaymentDate: string;
  onCancel: () => void;
}) {
  const { locale, t } = useLocalization();
  const [state, formAction] = useActionState(
    createPaymentAction,
    INITIAL_STATE,
  );
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const selectedInvoice = invoices.find(
    (invoice) => invoice.id === selectedInvoiceId,
  );
  const fieldErrors =
    state.status === "error" && state.fieldErrors ? state.fieldErrors : {};

  function selectInvoice(invoiceId: string) {
    setSelectedInvoiceId(invoiceId);
    const invoice = invoices.find((candidate) => candidate.id === invoiceId);
    setAmount(invoice ? invoice.remainingBalance.toString() : "");
  }

  return (
    <form
      action={formAction}
      className="border border-[var(--border)] bg-white p-5 sm:p-6"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-sm font-semibold">{t("payments.record")}</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {t("payments.recordDescription")}
          </p>
        </div>
        <span className="text-xs font-medium text-[var(--muted)]">
          {t("payments.referenceGenerated")}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-semibold md:col-span-2">
          {t("payments.invoice")}
          <select
            name="invoiceId"
            value={selectedInvoiceId}
            onChange={(event) => selectInvoice(event.target.value)}
            aria-invalid={Boolean(fieldErrors.invoiceId)}
            className={inputClasses("invoiceId", fieldErrors)}
          >
            <option value="">{t("payments.selectInvoice")}</option>
            {invoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.reference} · {invoice.tenantName} ·{" "}
                {t("common.roomNumber", { number: invoice.roomNumber })} ·{" "}
                {formatIdr(invoice.remainingBalance)}
              </option>
            ))}
          </select>
          <FieldError field="invoiceId" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold">
          {t("payments.date")}
          <input
            name="paymentDate"
            type="date"
            defaultValue={defaultPaymentDate}
            aria-invalid={Boolean(fieldErrors.paymentDate)}
            className={inputClasses("paymentDate", fieldErrors)}
          />
          <FieldError field="paymentDate" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold">
          {t("payments.amount")}
          <input
            name="amount"
            type="number"
            min="1"
            max={selectedInvoice?.remainingBalance ?? 1_000_000_000}
            step="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={Boolean(fieldErrors.amount)}
            className={inputClasses("amount", fieldErrors)}
          />
          <FieldError field="amount" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold">
          {t("payments.method")}
          <select
            name="method"
            defaultValue=""
            aria-invalid={Boolean(fieldErrors.method)}
            className={inputClasses("method", fieldErrors)}
          >
            <option value="">{t("payments.selectMethod")}</option>
            {PAYMENT_METHODS.map((method: PaymentMethod) => (
              <option key={method} value={method}>
                {formatPaymentMethod(method, locale)}
              </option>
            ))}
          </select>
          <FieldError field="method" fieldErrors={fieldErrors} />
        </label>
      </div>

      {selectedInvoice ? (
        <dl className="mt-5 grid gap-3 border border-[var(--border)] bg-[#f8f6f1] p-4 sm:grid-cols-3">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
              {t("payments.invoiceAmount")}
            </dt>
            <dd className="mt-1 text-xs font-semibold tabular-nums">
              {formatIdr(selectedInvoice.amount)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
              {t("payments.alreadyPaid")}
            </dt>
            <dd className="mt-1 text-xs font-semibold tabular-nums">
              {formatIdr(selectedInvoice.paidAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
              {t("payments.remainingBalance")}
            </dt>
            <dd className="mt-1 text-xs font-semibold tabular-nums">
              {formatIdr(selectedInvoice.remainingBalance)}
            </dd>
          </div>
          <div className="sm:col-span-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
              {t("common.billingPeriod")}
            </dt>
            <dd className="mt-1 text-xs font-semibold">
              {formatBillingPeriod(selectedInvoice.billingPeriod, locale)}
            </dd>
          </div>
        </dl>
      ) : null}

      <label className="mt-4 block text-xs font-semibold">
        {t("payments.notes")}
        <textarea
          name="notes"
          rows={4}
          placeholder={t("payments.notesHint")}
          aria-invalid={Boolean(fieldErrors.notes)}
          className={`${inputClasses("notes", fieldErrors)} py-3`}
        />
        <FieldError field="notes" fieldErrors={fieldErrors} />
      </label>

      <MutationFeedback state={state} mode="create" />

      <div className="mt-5 flex flex-wrap gap-3">
        <SubmitButton mode="create" />
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-10 items-center justify-center border border-[var(--border)] px-4 text-xs font-semibold hover:bg-[#f6f4ef]"
        >
          {t("payments.cancel")}
        </button>
      </div>
    </form>
  );
}

export function PaymentCreatePanel({
  canManage,
  invoices,
  defaultPaymentDate,
}: {
  canManage: boolean;
  invoices: readonly OutstandingInvoiceOption[];
  defaultPaymentDate: string;
}) {
  const { t } = useLocalization();
  const [isCreating, setIsCreating] = useState(false);

  if (!canManage) {
    return (
      <p className="text-xs text-[var(--muted)]">
        {t("payments.staffReadOnly")}
      </p>
    );
  }

  if (invoices.length === 0) {
    return (
      <p className="text-xs font-medium text-[var(--muted)]">
        {t("payments.noOutstandingInvoices")}
      </p>
    );
  }

  return isCreating ? (
    <CreatePaymentForm
      invoices={invoices}
      defaultPaymentDate={defaultPaymentDate}
      onCancel={() => setIsCreating(false)}
    />
  ) : (
    <button
      type="button"
      onClick={() => setIsCreating(true)}
      className="inline-flex min-h-10 items-center justify-center bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[#123c31]"
    >
      {t("payments.record")}
    </button>
  );
}

export function PaymentEditPanel({
  payment,
  canManage,
}: {
  payment: Payment;
  canManage: boolean;
}) {
  const { t } = useLocalization();
  const [isEditing, setIsEditing] = useState(false);
  const action = updatePaymentNotesAction.bind(null, payment.id);
  const [state, formAction] = useActionState(action, INITIAL_STATE);
  const fieldErrors =
    state.status === "error" && state.fieldErrors ? state.fieldErrors : {};

  if (!canManage) {
    return (
      <p className="text-xs text-[var(--muted)]">
        {t("payments.staffReadOnly")}
      </p>
    );
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="inline-flex min-h-10 items-center justify-center border border-[var(--brand)] px-4 text-xs font-semibold text-[var(--brand)] hover:bg-[#f0f5f2]"
      >
        {t("payments.editNotes")}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="border border-[var(--border)] bg-white p-5 sm:p-6"
    >
      <div>
        <h2 className="text-sm font-semibold">{t("payments.editNotes")}</h2>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          {t("payments.editDescription")}
        </p>
      </div>

      <label className="mt-4 block text-xs font-semibold">
        {t("payments.notes")}
        <textarea
          name="notes"
          rows={4}
          defaultValue={payment.notes}
          aria-invalid={Boolean(fieldErrors.notes)}
          className={`${inputClasses("notes", fieldErrors)} py-3`}
        />
        <FieldError field="notes" fieldErrors={fieldErrors} />
      </label>

      <MutationFeedback state={state} mode="edit" />

      <div className="mt-5 flex flex-wrap gap-3">
        <SubmitButton mode="edit" />
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="inline-flex min-h-10 items-center justify-center border border-[var(--border)] px-4 text-xs font-semibold hover:bg-[#f6f4ef]"
        >
          {t("payments.cancel")}
        </button>
      </div>
    </form>
  );
}
