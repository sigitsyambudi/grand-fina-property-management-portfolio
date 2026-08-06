"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createInvoiceAction,
  updateInvoiceAction,
} from "@/app/(workspace)/invoices/actions";
import { useLocalization } from "@/components/localization/localization-provider";
import { formatIdr } from "@/components/rooms/room-formatters";
import type { Invoice } from "@/lib/data/types";
import type { InvoiceMutationResult } from "@/lib/data/invoice-write";
import {
  deriveInvoiceDueDate,
  type InvoiceFieldError,
  type InvoiceWriteField,
} from "@/lib/data/invoice-write-validation";
import type { TranslationKey } from "@/lib/i18n/types";

const INITIAL_STATE: InvoiceMutationResult = { status: "idle" };

export type BillableLeaseOption = {
  id: string;
  reference: string;
  tenantName: string;
  roomNumber: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  billingDay: number;
};

const fieldErrorKeys: Record<InvoiceFieldError, TranslationKey> = {
  required: "invoices.validationRequired",
  "invalid-selection": "invoices.validationSelection",
  "invalid-period": "invoices.validationPeriod",
  "invalid-date": "invoices.validationDate",
  "invalid-date-range": "invoices.validationDateRange",
  "invalid-due-date": "invoices.validationDueDate",
  "invalid-amount": "invoices.validationAmount",
  "too-long": "invoices.validationTooLong",
};

function isLeaseBillableForPeriod(
  lease: BillableLeaseOption,
  billingPeriod: string,
): boolean {
  if (!/^\d{4}-\d{2}$/.test(billingPeriod)) {
    return false;
  }

  const [year, month] = billingPeriod.split("-").map(Number);
  const periodStart = `${billingPeriod}-01`;
  const periodEnd = new Date(Date.UTC(year, month, 0))
    .toISOString()
    .slice(0, 10);

  return (
    lease.startDate <= periodEnd &&
    (!lease.endDate || lease.endDate >= periodStart)
  );
}

function FieldError({
  field,
  fieldErrors,
}: {
  field: InvoiceWriteField;
  fieldErrors: Partial<Record<InvoiceWriteField, InvoiceFieldError>>;
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
  field: InvoiceWriteField,
  fieldErrors: Partial<Record<InvoiceWriteField, InvoiceFieldError>>,
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
        ? t("invoices.saving")
        : mode === "create"
          ? t("invoices.create")
          : t("invoices.save")}
    </button>
  );
}

function MutationFeedback({
  state,
  mode,
}: {
  state: InvoiceMutationResult;
  mode: "create" | "edit";
}) {
  const { t } = useLocalization();

  if (state.status === "success") {
    return (
      <div className="mt-4 text-xs font-semibold text-[var(--brand)]" role="status">
        <p>
          {t(
            mode === "create"
              ? "invoices.createSuccess"
              : "invoices.updateSuccess",
          )}
        </p>
        {mode === "create" ? (
          <Link
            href={`/invoices/${state.invoiceId}`}
            className="mt-2 inline-flex underline underline-offset-4"
          >
            {t("invoices.viewCreated")}
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
      ? "invoices.mutationUnauthorized"
      : state.code === "not-found"
        ? "invoices.mutationNotFound"
        : state.code === "lease-not-billable"
          ? "invoices.leaseNotBillable"
          : state.code === "duplicate"
            ? "invoices.duplicate"
            : state.code === "payment-protected"
              ? "invoices.paymentProtected"
              : state.code === "unexpected-fields" ||
                  state.code === "invalid-request"
                ? "invoices.validationUnexpected"
                : mode === "create"
                  ? "invoices.createFailed"
                  : "invoices.updateFailed";

  return (
    <p className="mt-4 text-xs font-semibold text-[#9b2c2c]" role="alert">
      {t(messageKey)}
    </p>
  );
}

function CreateInvoiceForm({
  leases,
  suggestedBillingPeriod,
  defaultIssueDate,
  onCancel,
}: {
  leases: readonly BillableLeaseOption[];
  suggestedBillingPeriod: string;
  defaultIssueDate: string;
  onCancel: () => void;
}) {
  const { t } = useLocalization();
  const [state, formAction] = useActionState(
    createInvoiceAction,
    INITIAL_STATE,
  );
  const [selectedLeaseId, setSelectedLeaseId] = useState("");
  const [billingPeriod, setBillingPeriod] = useState(
    suggestedBillingPeriod,
  );
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const fieldErrors =
    state.status === "error" && state.fieldErrors ? state.fieldErrors : {};
  const eligibleLeases = leases.filter((lease) =>
    isLeaseBillableForPeriod(lease, billingPeriod),
  );
  const selectedLease = eligibleLeases.find(
    (lease) => lease.id === selectedLeaseId,
  );

  function applyLeaseAndPeriod(leaseId: string, period: string) {
    const lease = leases.find((candidate) => candidate.id === leaseId);
    setDueDate(
      lease && period
        ? deriveInvoiceDueDate(period, lease.billingDay)
        : "",
    );
  }

  function selectLease(leaseId: string) {
    setSelectedLeaseId(leaseId);
    const lease = leases.find((candidate) => candidate.id === leaseId);
    setAmount(lease ? lease.monthlyRent.toString() : "");
    applyLeaseAndPeriod(leaseId, billingPeriod);
  }

  function selectBillingPeriod(period: string) {
    setBillingPeriod(period);
    const remainsEligible = leases.some(
      (lease) =>
        lease.id === selectedLeaseId &&
        isLeaseBillableForPeriod(lease, period),
    );

    if (selectedLeaseId && !remainsEligible) {
      setSelectedLeaseId("");
      setAmount("");
      setDueDate("");
      return;
    }

    applyLeaseAndPeriod(selectedLeaseId, period);
  }

  return (
    <form
      action={formAction}
      className="border border-[var(--border)] bg-white p-5 sm:p-6"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-sm font-semibold">{t("invoices.create")}</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {t("invoices.createDescription")}
          </p>
        </div>
        <span className="text-xs font-medium text-[var(--muted)]">
          {t("invoices.statusDerived")}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-semibold">
          {t("invoices.lease")}
          <select
            name="leaseId"
            value={selectedLeaseId}
            onChange={(event) => selectLease(event.target.value)}
            aria-invalid={Boolean(fieldErrors.leaseId)}
            className={inputClasses("leaseId", fieldErrors)}
          >
            <option value="">{t("invoices.selectLease")}</option>
            {eligibleLeases.map((lease) => (
              <option key={lease.id} value={lease.id}>
                {lease.reference} · {lease.tenantName} ·{" "}
                {t("common.roomNumber", { number: lease.roomNumber })}
              </option>
            ))}
          </select>
          <FieldError field="leaseId" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold">
          {t("common.billingPeriod")}
          <input
            name="billingPeriod"
            type="month"
            value={billingPeriod}
            onChange={(event) => selectBillingPeriod(event.target.value)}
            aria-invalid={Boolean(fieldErrors.billingPeriod)}
            className={inputClasses("billingPeriod", fieldErrors)}
          />
          <FieldError field="billingPeriod" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold">
          {t("invoices.issueDate")}
          <input
            name="issueDate"
            type="date"
            defaultValue={defaultIssueDate}
            aria-invalid={Boolean(fieldErrors.issueDate)}
            className={inputClasses("issueDate", fieldErrors)}
          />
          <FieldError field="issueDate" fieldErrors={fieldErrors} />
        </label>

        <label className="block text-xs font-semibold">
          {t("common.dueDate")}
          <input
            name="dueDate"
            type="date"
            value={dueDate}
            readOnly
            aria-invalid={Boolean(fieldErrors.dueDate)}
            className={`${inputClasses("dueDate", fieldErrors)} bg-[#f8f6f1]`}
          />
          <FieldError field="dueDate" fieldErrors={fieldErrors} />
          <span className="mt-1 block text-[11px] text-[var(--muted)]">
            {t("invoices.dueDateDerived")}
          </span>
        </label>

        <label className="block text-xs font-semibold">
          {t("invoices.amount")}
          <input
            name="amount"
            type="number"
            min="1"
            max="1000000000"
            step="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={Boolean(fieldErrors.amount)}
            className={inputClasses("amount", fieldErrors)}
          />
          <FieldError field="amount" fieldErrors={fieldErrors} />
          {selectedLease ? (
            <span className="mt-1 block text-[11px] text-[var(--muted)]">
              {t("invoices.leaseRateDefault", {
                amount: formatIdr(selectedLease.monthlyRent),
              })}
            </span>
          ) : null}
        </label>
      </div>

      <label className="mt-4 block text-xs font-semibold">
        {t("common.notes")}
        <textarea
          name="notes"
          rows={4}
          placeholder={t("invoices.notesHint")}
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
          {t("invoices.cancel")}
        </button>
      </div>
    </form>
  );
}

export function InvoiceCreatePanel({
  canManage,
  leases,
  suggestedBillingPeriod,
  defaultIssueDate,
}: {
  canManage: boolean;
  leases: readonly BillableLeaseOption[];
  suggestedBillingPeriod: string;
  defaultIssueDate: string;
}) {
  const { t } = useLocalization();
  const [isCreating, setIsCreating] = useState(false);

  if (!canManage) {
    return null;
  }

  return isCreating ? (
    <CreateInvoiceForm
      leases={leases}
      suggestedBillingPeriod={suggestedBillingPeriod}
      defaultIssueDate={defaultIssueDate}
      onCancel={() => setIsCreating(false)}
    />
  ) : (
    <button
      type="button"
      onClick={() => setIsCreating(true)}
      className="inline-flex min-h-10 items-center justify-center bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[#123c31]"
    >
      {t("invoices.create")}
    </button>
  );
}

export function InvoiceEditPanel({
  invoice,
  canManage,
  hasPayments,
}: {
  invoice: Invoice;
  canManage: boolean;
  hasPayments: boolean;
}) {
  const { t } = useLocalization();
  const [isEditing, setIsEditing] = useState(false);
  const action = updateInvoiceAction.bind(null, invoice.id);
  const [state, formAction] = useActionState(action, INITIAL_STATE);
  const fieldErrors =
    state.status === "error" && state.fieldErrors ? state.fieldErrors : {};

  if (!canManage) {
    return (
      <p className="text-xs text-[var(--muted)]">
        {t("invoices.staffReadOnly")}
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
        {t("invoices.edit")}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="border border-[var(--border)] bg-white p-5 sm:p-6"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-sm font-semibold">{t("invoices.edit")}</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {t("invoices.editDescription")}
          </p>
        </div>
        <span className="text-xs font-medium text-[var(--muted)]">
          {t("invoices.identifiersImmutable")}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-semibold">
          {t("invoices.issueDate")}
          <input
            name="issueDate"
            type="date"
            defaultValue={invoice.issueDate}
            aria-invalid={Boolean(fieldErrors.issueDate)}
            className={inputClasses("issueDate", fieldErrors)}
          />
          <FieldError field="issueDate" fieldErrors={fieldErrors} />
        </label>
        <label className="block text-xs font-semibold">
          {t("common.dueDate")}
          <input
            name="dueDate"
            type="date"
            defaultValue={invoice.dueDate}
            aria-invalid={Boolean(fieldErrors.dueDate)}
            className={inputClasses("dueDate", fieldErrors)}
          />
          <FieldError field="dueDate" fieldErrors={fieldErrors} />
        </label>
        <label className="block text-xs font-semibold">
          {t("invoices.amount")}
          <input
            name="amount"
            type="number"
            min="1"
            max="1000000000"
            step="1"
            defaultValue={invoice.amount}
            readOnly={hasPayments}
            aria-invalid={Boolean(fieldErrors.amount)}
            className={`${inputClasses("amount", fieldErrors)} ${
              hasPayments ? "bg-[#f8f6f1]" : ""
            }`}
          />
          <FieldError field="amount" fieldErrors={fieldErrors} />
          {hasPayments ? (
            <span className="mt-1 block text-[11px] text-[var(--muted)]">
              {t("invoices.amountPaymentLocked")}
            </span>
          ) : null}
        </label>
      </div>

      <label className="mt-4 block text-xs font-semibold">
        {t("common.notes")}
        <textarea
          name="notes"
          rows={4}
          defaultValue={invoice.notes}
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
          {t("invoices.cancel")}
        </button>
      </div>
    </form>
  );
}
