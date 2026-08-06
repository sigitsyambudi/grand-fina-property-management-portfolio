import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LocalizedText } from "@/components/localization/localized-text";
import { LocalizedDisplay } from "@/components/localization/localized-display";
import { LocalizedSection } from "@/components/localization/localized-section";
import { ExpenseCategoryBadge } from "@/components/expenses/expense-category-badge";
import { ExpenseStatusBadge } from "@/components/expenses/expense-status-badge";
import {
  ExpenseEditPanel,
  ExpenseVoidPanel,
} from "@/components/expenses/expense-write-panels";
import { formatIdr } from "@/components/rooms/room-formatters";
import { SectionCard } from "@/components/ui/section-card";
import { getPropertyAccess, hasRole } from "@/lib/auth/access";
import { getWorkspaceData } from "@/lib/data/workspace-read";

type ExpenseDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ExpenseDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getWorkspaceData();
  const expense = data?.expenses.find((candidate) => candidate.id === id);
  const isDemoExpense = expense?.reference.includes("-DEMO-") ?? false;

  return {
    title: expense ? expense.reference : "Expense not found",
    description: expense
      ? `${
          isDemoExpense ? "Fictional demo" : "Persisted"
        } fictional Emerald Haven Residence expense record: ${expense.reference}.`
      : "The requested expense record could not be found.",
  };
}

export default async function ExpenseDetailPage({
  params,
}: ExpenseDetailPageProps) {
  const { id } = await params;
  const [data, access] = await Promise.all([
    getWorkspaceData(),
    getPropertyAccess(),
  ]);

  if (!data) {
    return null;
  }

  const expense = data.expenses.find((candidate) => candidate.id === id);

  if (!expense) {
    notFound();
  }

  const room = expense.roomId
    ? data.rooms.find((candidate) => candidate.id === expense.roomId)
    : null;
  const isDemoExpense = expense.reference.includes("-DEMO-");
  const canManage =
    access.status === "authorized" &&
    hasRole(access, ["owner", "admin"]);

  if (expense.roomId && !room) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/expenses"
        className="inline-flex min-h-10 items-center text-xs font-semibold text-[var(--brand)] underline decoration-[#b6c4be] underline-offset-4 hover:decoration-[var(--brand)]"
      >
        ← <LocalizedText translationKey="common.backToExpenses" />
      </Link>

      <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-[28px]">
              {expense.reference}
            </h1>
            <ExpenseStatusBadge status={expense.status} />
            <span className="rounded bg-[#f6eddd] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#815d22]">
              <LocalizedText
                translationKey={
                  isDemoExpense
                    ? "expenses.demoBadge"
                    : "expenses.persistedBadge"
                }
              />
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            <LocalizedDisplay kind="date" value={expense.expenseDate} /> ·{" "}
            {room ? <LocalizedText translationKey="common.roomNumber" values={{ number: room.roomNumber }} /> : <LocalizedText translationKey="common.propertyWide" />}
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">
          <LocalizedText
            translationKey={
              isDemoExpense
                ? "expenses.demoSeedRecord"
                : "expenses.operationalRecord"
            }
          />
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <ExpenseEditPanel
            expense={expense}
            canManage={canManage}
            rooms={data.rooms.map((candidate) => ({
              id: candidate.id,
              roomNumber: candidate.roomNumber,
            }))}
          />
          <ExpenseVoidPanel expense={expense} canManage={canManage} />
        </div>
        {!canManage && expense.status !== "void" ? (
          <p className="text-xs text-[var(--muted)]">
            <LocalizedText translationKey="expenses.staffReadOnly" />
          </p>
        ) : null}
      </div>

      <LocalizedSection
        ariaLabelKey="expenses.summaryAria"
        className="grid grid-cols-2 border border-[var(--border)] bg-white lg:grid-cols-4"
      >
        <div className="border-b border-r border-[var(--border)] p-4 sm:p-5 lg:border-b-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="common.amount" />
          </p>
          <p className="mt-2 text-base font-semibold tabular-nums">
            {formatIdr(expense.amount)}
          </p>
        </div>
        <div className="border-b border-[var(--border)] p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="expenses.expenseDate" />
          </p>
          <p className="mt-2 text-sm font-semibold">
            <LocalizedDisplay kind="date" value={expense.expenseDate} />
          </p>
        </div>
        <div className="border-r border-[var(--border)] p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="common.category" />
          </p>
          <div className="mt-2">
            <ExpenseCategoryBadge category={expense.category} />
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <LocalizedText translationKey="common.status" />
          </p>
          <div className="mt-2">
            <ExpenseStatusBadge status={expense.status} />
          </div>
        </div>
      </LocalizedSection>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <div className="space-y-6">
          <SectionCard
            title={<LocalizedText translationKey="expenses.information" />}
            description={<LocalizedText translationKey="expenses.informationDescription" />}
          >
            <dl className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="common.description" />
                </dt>
                <dd className="mt-2 text-sm font-semibold">
                  <LocalizedDisplay kind="record-text" value={expense.description} />
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="common.vendor" />
                </dt>
                <dd className="mt-2 text-sm font-semibold">
                  <LocalizedDisplay kind="record-text" value={expense.vendor} />
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="expenses.paymentMethod" />
                </dt>
                <dd className="mt-2 text-sm font-semibold">
                  <LocalizedDisplay kind="expense-payment-method" value={expense.paymentMethod} />
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <LocalizedText translationKey="common.scope" />
                </dt>
                <dd className="mt-2 text-sm font-semibold">
                  {room ? <LocalizedText translationKey="common.roomNumber" values={{ number: room.roomNumber }} /> : <LocalizedText translationKey="common.propertyWide" />}
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title={<LocalizedText translationKey="expenses.propertyScope" />}
            description={
              room
                ? <LocalizedText translationKey="expenses.roomResolved" />
                : <LocalizedText translationKey="expenses.notAssignedToRoom" />
            }
          >
            <div className="p-5 sm:p-6">
              {room ? (
                <>
                  <p className="text-sm font-semibold">
                    <LocalizedText translationKey="common.roomNumber" values={{ number: room.roomNumber }} />
                  </p>
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
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold">
                    <LocalizedText translationKey="expenses.propertyWideExpense" />
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    <LocalizedText translationKey="expenses.noRoomRelationship" />
                  </p>
                </>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title={<LocalizedText translationKey="expenses.recordDetails" />}
            description={
              <LocalizedText
                translationKey={
                  isDemoExpense
                    ? "expenses.persistedDemoDescription"
                    : "expenses.persistedOperationalDescription"
                }
              />
            }
          >
            <dl className="divide-y divide-[var(--border)]">
              <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <dt className="text-xs text-[var(--muted)]"><LocalizedText translationKey="common.reference" /></dt>
                <dd className="text-right text-xs font-semibold">
                  {expense.reference}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <dt className="text-xs text-[var(--muted)]"><LocalizedText translationKey="common.category" /></dt>
                <dd className="text-right text-xs font-semibold">
                  <LocalizedDisplay kind="expense-category" value={expense.category} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <dt className="text-xs text-[var(--muted)]"><LocalizedText translationKey="common.method" /></dt>
                <dd className="text-right text-xs font-semibold">
                  <LocalizedDisplay kind="expense-payment-method" value={expense.paymentMethod} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <dt className="text-xs text-[var(--muted)]"><LocalizedText translationKey="common.status" /></dt>
                <dd>
                  <ExpenseStatusBadge status={expense.status} />
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title={<LocalizedText translationKey="common.notes" />}
            description={
              <LocalizedText
                translationKey={
                  isDemoExpense
                    ? "expenses.demoNoteDescription"
                    : "expenses.operationalNoteDescription"
                }
              />
            }
          >
            <div className="p-5 sm:p-6">
              <p className="text-sm leading-6 text-[var(--foreground)]">
                {expense.notes ? <LocalizedDisplay kind="record-text" value={expense.notes} /> : "—"}
              </p>
            </div>
          </SectionCard>

          {expense.status === "void" ? (
            <SectionCard
              title={<LocalizedText translationKey="expenses.voidDetails" />}
              description={
                <LocalizedText translationKey="expenses.voidAuditDescription" />
              }
            >
              <dl className="divide-y divide-[var(--border)]">
                <div className="px-5 py-4 sm:px-6">
                  <dt className="text-xs text-[var(--muted)]">
                    <LocalizedText translationKey="expenses.voidReason" />
                  </dt>
                  <dd className="mt-2 text-sm font-medium">
                    {expense.voidReason}
                  </dd>
                </div>
                <div className="px-5 py-4 sm:px-6">
                  <dt className="text-xs text-[var(--muted)]">
                    <LocalizedText translationKey="expenses.voidedAt" />
                  </dt>
                  <dd className="mt-2 text-sm font-medium">
                    {expense.voidedAt
                      ? <LocalizedDisplay kind="timestamp" value={expense.voidedAt} timeZone={data.property.timezone} />
                      : "—"}
                  </dd>
                </div>
              </dl>
            </SectionCard>
          ) : null}

          <SectionCard
            title={<LocalizedText translationKey="settings.dataClassification" />}
            description={<LocalizedText translationKey="expenses.privacyDescription" />}
          >
            <div className="p-5 sm:p-6">
              <p className="text-xs leading-5 text-[var(--muted)]">
                <LocalizedText
                  translationKey={
                    isDemoExpense
                      ? "expenses.demoClassification"
                      : "expenses.persistedClassification"
                  }
                />
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
