import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LocalizedText } from "@/components/localization/localized-text";
import { LocalizedDisplay } from "@/components/localization/localized-display";
import { LocalizedSection } from "@/components/localization/localized-section";
import { PaymentStatusBadge } from "@/components/payments/payment-status-badge";
import { PaymentEditPanel } from "@/components/payments/payment-write-panels";
import { formatIdr } from "@/components/rooms/room-formatters";
import { SectionCard } from "@/components/ui/section-card";
import { getPropertyAccess, hasRole } from "@/lib/auth/access";
import { getWorkspaceData } from "@/lib/data/workspace-read";

type PaymentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PaymentDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getWorkspaceData();
  const payment = data?.payments.find((candidate) => candidate.id === id);
  const isDemoPayment = payment?.reference.includes("-DEMO-") ?? false;

  return {
    title: payment ? payment.reference : "Payment not found",
    description: payment
      ? `${isDemoPayment ? "Fictional demo payment" : "Recorded fictional payment"} for Emerald Haven Residence: ${payment.reference}.`
      : "The requested payment record could not be found.",
  };
}

export default async function PaymentDetailPage({
  params,
}: PaymentDetailPageProps) {
  const { id } = await params;
  const [data, access] = await Promise.all([
    getWorkspaceData(),
    getPropertyAccess(),
  ]);

  if (!data) {
    return null;
  }

  const payment = data.payments.find((candidate) => candidate.id === id);

  if (!payment) {
    notFound();
  }
  const isDemoPayment = payment.reference.includes("-DEMO-");

  const invoice = data.invoices.find(
    (candidate) => candidate.id === payment.invoiceId,
  );

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

  return (
    <div className="space-y-6">
      <Link
        href="/payments"
        className="inline-flex min-h-10 items-center text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4 hover:decoration-[var(--brand)]"
      >
        ← <LocalizedText translationKey="common.backToPayments" />
      </Link>

      <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-[28px]">
              {payment.reference}
            </h1>
            <PaymentStatusBadge status={payment.status} />
            <span className="rounded bg-[#f6eddd] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#815d22]">
              <LocalizedText
                translationKey={
                  isDemoPayment
                    ? "payments.demoRecord"
                    : "payments.recordedEvent"
                }
              />
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            <LocalizedDisplay kind="date" value={payment.paymentDate} /> · <LocalizedText translationKey="common.roomNumber" values={{ number: room.roomNumber }} />
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">
          <LocalizedText translationKey="payments.immutableReceipt" />
        </p>
      </div>

      <PaymentEditPanel
        payment={payment}
        canManage={
          access.status === "authorized" &&
          hasRole(access, ["owner", "admin"])
        }
      />

      <LocalizedSection
        ariaLabelKey="payments.summaryAria"
        className="grid grid-cols-2 border border-[var(--border)] bg-white lg:grid-cols-4"
      >
        <div className="border-b border-r border-[var(--border)] p-4 lg:border-b-0 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="payments.paymentAmount" />
          </p>
          <p className="mt-2 text-base font-semibold tabular-nums">
            {formatIdr(payment.amount)}
          </p>
        </div>
        <div className="border-b border-[var(--border)] p-4 lg:border-b-0 lg:border-r sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="payments.paymentDate" />
          </p>
          <p className="mt-2 text-sm font-semibold">
            <LocalizedDisplay kind="date" value={payment.paymentDate} />
          </p>
        </div>
        <div className="border-r border-[var(--border)] p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="common.method" />
          </p>
          <p className="mt-2 text-sm font-semibold">
            <LocalizedDisplay kind="payment-method" value={payment.method} />
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="common.status" />
          </p>
          <div className="mt-2">
            <PaymentStatusBadge status={payment.status} />
          </div>
        </div>
      </LocalizedSection>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <div className="space-y-6">
          <SectionCard
            title={<LocalizedText translationKey="payments.allocation" />}
            description={
              <LocalizedText translationKey="payments.allocationDescription" />
            }
          >
            <dl className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="navigation.invoices" />
                </dt>
                <dd className="mt-2 text-sm font-semibold">
                  {invoice.reference}
                </dd>
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="mt-3 inline-flex min-h-9 items-center text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4 hover:decoration-[var(--brand)]"
                >
                  <LocalizedText translationKey="common.viewInvoiceDetails" />
                </Link>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="navigation.leases" />
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

          <SectionCard
            title={<LocalizedText translationKey="payments.tenantRoom" />}
            description={<LocalizedText translationKey="payments.relationshipDescription" />}
          >
            <dl className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
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
            </dl>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title={<LocalizedText translationKey="payments.information" />}
            description={
              <LocalizedText
                translationKey={
                  isDemoPayment
                    ? "payments.demoInformationDescription"
                    : "payments.recordedInformationDescription"
                }
              />
            }
          >
            <dl className="divide-y divide-[var(--border)]">
              <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <dt className="text-xs text-[var(--muted)]"><LocalizedText translationKey="common.reference" /></dt>
                <dd className="text-right text-xs font-semibold">
                  {payment.reference}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <dt className="text-xs text-[var(--muted)]"><LocalizedText translationKey="common.method" /></dt>
                <dd className="text-right text-xs font-semibold">
                  <LocalizedDisplay kind="payment-method" value={payment.method} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <dt className="text-xs text-[var(--muted)]"><LocalizedText translationKey="common.status" /></dt>
                <dd>
                  <PaymentStatusBadge status={payment.status} />
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title={<LocalizedText translationKey="settings.dataClassification" />}
            description={
              <LocalizedText translationKey="payments.classificationDescription" />
            }
          >
            <dl className="divide-y divide-[var(--border)]">
              <div className="px-5 py-4 sm:px-6">
                <dt className="text-xs font-semibold text-[var(--foreground)]">
                  <LocalizedText translationKey="payments.canonicalRelationship" />
                </dt>
                <dd className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  <LocalizedText translationKey="payments.canonicalRelationshipDescription" />
                </dd>
              </div>
              <div className="px-5 py-4 sm:px-6">
                <dt className="text-xs font-semibold text-[var(--foreground)]">
                  <LocalizedText
                    translationKey={
                      isDemoPayment
                        ? "payments.demoRecord"
                        : "payments.recordedEvent"
                    }
                  />
                </dt>
                <dd className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  <LocalizedText
                    translationKey={
                      isDemoPayment
                        ? "payments.demoOwnedFields"
                        : "payments.recordedOwnedFields"
                    }
                  />
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title={<LocalizedText translationKey="common.notes" />}
            description={
              <LocalizedText translationKey="payments.notesDescription" />
            }
          >
            <div className="p-5 sm:p-6">
              <p className="text-sm leading-6 text-[var(--foreground)]">
                <LocalizedDisplay kind="record-text" value={payment.notes} />
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
