import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LocalizedText } from "@/components/localization/localized-text";
import { LocalizedDisplay } from "@/components/localization/localized-display";
import { LocalizedSection } from "@/components/localization/localized-section";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { InvoiceEditPanel } from "@/components/invoices/invoice-write-panels";
import { PaymentStatusBadge } from "@/components/payments/payment-status-badge";
import { formatIdr } from "@/components/rooms/room-formatters";
import { SectionCard } from "@/components/ui/section-card";
import { getPropertyAccess, hasRole } from "@/lib/auth/access";
import { getWorkspaceData } from "@/lib/data/workspace-read";

type InvoiceDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: InvoiceDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getWorkspaceData();
  const invoice = data?.invoices.find((candidate) => candidate.id === id);

  return {
    title: invoice ? invoice.reference : "Invoice not found",
    description: invoice
      ? `Fictional Emerald Haven Residence billing record ${invoice.reference}.`
      : "The requested fictional invoice record could not be found.",
  };
}

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const { id } = await params;
  const [data, access] = await Promise.all([
    getWorkspaceData(),
    getPropertyAccess(),
  ]);

  if (!data) {
    return null;
  }

  const invoice = data.invoices.find((candidate) => candidate.id === id);

  if (!invoice) {
    notFound();
  }

  const lease = data.leases.find(
    (candidate) => candidate.id === invoice.leaseId,
  );

  if (!lease) {
    notFound();
  }

  const tenant = data.tenants.find(
    (candidate) => candidate.id === lease.tenantId,
  );
  const room = data.rooms.find(
    (candidate) => candidate.id === lease.roomId,
  );

  if (!tenant || !room) {
    notFound();
  }
  const invoicePayments = data.payments
    .filter((payment) => payment.invoiceId === invoice.id)
    .sort(
      (left, right) =>
        right.paymentDate.localeCompare(left.paymentDate) ||
        right.reference.localeCompare(left.reference),
    );

  return (
    <div className="space-y-6">
      <Link
        href="/invoices"
        className="inline-flex min-h-10 items-center text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4 hover:decoration-[var(--brand)]"
      >
        ← <LocalizedText translationKey="common.backToInvoices" />
      </Link>

      <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-[28px]">
              {invoice.reference}
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
            <span className="rounded bg-[#f6eddd] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#815d22]">
              <LocalizedText translationKey="invoices.demoBillingRecord" />
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            <LocalizedDisplay kind="billing-period" value={invoice.billingPeriod} /> ·{" "}
            <LocalizedText translationKey="common.roomNumber" values={{ number: room.roomNumber }} />
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">
          <LocalizedText translationKey="invoices.paidAmountDerivedPayments" />
        </p>
      </div>

      <InvoiceEditPanel
        invoice={invoice}
        canManage={
          access.status === "authorized" &&
          hasRole(access, ["owner", "admin"])
        }
        hasPayments={data.payments.some(
          (payment) => payment.invoiceId === invoice.id,
        )}
      />

      <LocalizedSection
        ariaLabelKey="invoices.summaryAria"
        className="grid grid-cols-2 border border-[var(--border)] bg-white lg:grid-cols-4"
      >
        <div className="border-b border-r border-[var(--border)] p-4 lg:border-b-0 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="invoices.amount" />
          </p>
          <p className="mt-2 text-base font-semibold tabular-nums">
            {formatIdr(invoice.amount)}
          </p>
        </div>
        <div className="border-b border-[var(--border)] p-4 lg:border-b-0 lg:border-r sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="invoices.paidAmount" />
          </p>
          <p className="mt-2 text-base font-semibold tabular-nums">
            {formatIdr(invoice.paidAmount)}
          </p>
        </div>
        <div className="border-r border-[var(--border)] p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="invoices.remaining" />
          </p>
          <p className="mt-2 text-base font-semibold tabular-nums">
            {formatIdr(invoice.balance)}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="common.status" />
          </p>
          <div className="mt-2">
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>
      </LocalizedSection>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <div className="space-y-6">
          <SectionCard
            title={<LocalizedText translationKey="invoices.billingDetails" />}
            description={
              <LocalizedText translationKey="invoices.billingDetailsDescription" />
            }
          >
            <dl className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="common.billingPeriod" />
                </dt>
                <dd className="mt-2 text-sm font-semibold">
                  <LocalizedDisplay kind="billing-period" value={invoice.billingPeriod} />
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="invoices.issueDate" />
                </dt>
                <dd className="mt-2 text-sm font-semibold">
                  <LocalizedDisplay kind="date" value={invoice.issueDate} />
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="common.dueDate" />
                </dt>
                <dd className="mt-2 text-sm font-semibold">
                  <LocalizedDisplay kind="date" value={invoice.dueDate} />
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="invoices.paymentStatus" />
                </dt>
                <dd className="mt-2">
                  <InvoiceStatusBadge status={invoice.status} />
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title={<LocalizedText translationKey="payments.history" />}
            description={
              <LocalizedText translationKey="payments.historyDescription" />
            }
          >
            {invoicePayments.length > 0 ? (
              <div className="divide-y divide-[var(--border)]">
                {invoicePayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-6"
                  >
                    <div>
                      <Link
                        href={`/payments/${payment.id}`}
                        className="text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4 hover:decoration-[var(--brand)]"
                      >
                        {payment.reference}
                      </Link>
                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                        <LocalizedDisplay kind="date" value={payment.paymentDate} />
                      </p>
                    </div>
                    <PaymentStatusBadge status={payment.status} />
                    <p className="text-sm font-semibold tabular-nums">
                      {formatIdr(payment.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-6 text-xs text-[var(--muted)] sm:px-6">
                <LocalizedText translationKey="payments.noHistory" />
              </p>
            )}
          </SectionCard>

          <SectionCard
            title={<LocalizedText translationKey="invoices.rentalRelationship" />}
            description={<LocalizedText translationKey="invoices.relationshipDescription" />}
          >
            <dl className="grid gap-5 p-5 sm:grid-cols-3 sm:p-6">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="common.tenant" />
                </dt>
                <dd className="mt-2 text-sm font-semibold">
                  {tenant.fullName}
                </dd>
                <Link
                  href={`/tenants/${tenant.id}`}
                  className="mt-3 inline-flex min-h-9 items-center text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4 hover:decoration-[var(--brand)]"
                >
                  <LocalizedText translationKey="common.viewTenantDetails" />
                </Link>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="common.room" />
                </dt>
                <dd className="mt-2 text-sm font-semibold">
                  <LocalizedText translationKey="common.roomNumber" values={{ number: room.roomNumber }} />
                </dd>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  <LocalizedDisplay kind="display-value" value={room.location} />
                  {room.floor ? (
                    <> · <LocalizedText translationKey="common.floorNumber" values={{ floor: room.floor }} /></>
                  ) : null}
                </p>
                <Link
                  href={`/rooms/${room.id}`}
                  className="mt-3 inline-flex min-h-9 items-center text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4 hover:decoration-[var(--brand)]"
                >
                  <LocalizedText translationKey="common.viewRoomDetails" />
                </Link>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="invoices.lease" />
                </dt>
                <dd className="mt-2 text-sm font-semibold">
                  {lease.reference}
                </dd>
                <Link
                  href={`/leases/${lease.id}`}
                  className="mt-3 inline-flex min-h-9 items-center text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4 hover:decoration-[var(--brand)]"
                >
                  <LocalizedText translationKey="common.viewLeaseDetails" />
                </Link>
              </div>
            </dl>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title={<LocalizedText translationKey="invoices.rateBasis" />}
            description={
              <LocalizedText translationKey="invoices.rateBasisDescription" />
            }
          >
            <div className="p-5 sm:p-6">
              <p className="text-xl font-semibold tabular-nums">
                {formatIdr(lease.monthlyRent)}
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                <LocalizedText
                  translationKey="invoices.rateSnapshotExplanation"
                  values={{ room: room.roomNumber }}
                />
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title={<LocalizedText translationKey="settings.dataClassification" />}
            description={
              <LocalizedText translationKey="invoices.classificationDescription" />
            }
          >
            <dl className="divide-y divide-[var(--border)]">
              <div className="px-5 py-4 sm:px-6">
                <dt className="text-xs font-semibold text-[var(--foreground)]">
                  <LocalizedText translationKey="invoices.canonicalConfiguration" />
                </dt>
                <dd className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  <LocalizedText translationKey="invoices.canonicalConfigurationDescription" />
                </dd>
              </div>
              <div className="px-5 py-4 sm:px-6">
                <dt className="text-xs font-semibold text-[var(--foreground)]">
                  <LocalizedText translationKey="invoices.fictionalFields" />
                </dt>
                <dd className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  <LocalizedText translationKey="invoices.demoFieldsDescription" />
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title={<LocalizedText translationKey="common.notes" />}
            description={<LocalizedText translationKey="invoices.notesDescription" />}
          >
            <div className="p-5 sm:p-6">
              <p className="text-sm leading-6 text-[var(--foreground)]">
                <LocalizedDisplay kind="record-text" value={invoice.notes} />
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
