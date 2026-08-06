# Management reporting semantics

Status: Accepted for Milestone 22

## Scope

Portfolio Edition management reporting is a read-only projection of the fictional
property-scoped operational tables. It does not copy records into reporting
tables and does not introduce a separate accounting ledger.

The server loads the authorized property workspace once, through the existing
Supabase client and Row Level Security policies, then applies small in-process
aggregations. This is appropriate for the current single-property scale and
keeps every reported value traceable to its owning operational record.

## Definitions

- **Potential monthly rent** is the sum of `rooms.monthly_rate` for the current
  canonical room inventory.
- **Active rent value** is the sum of `leases.monthly_rent` for leases whose
  current status is `active`.
- **Invoiced amount** is the sum of non-draft, non-void invoice amounts whose
  `billing_period` equals the selected month.
- **Amount received** is the sum of payments whose status is `completed` and
  whose `payment_date` falls in the selected month. Payment date, rather than
  invoice period, is the cash-receipt date.
- **Outstanding amount** is the current remaining balance of non-draft,
  non-void invoices in the selected invoice period. It is a current balance for
  that invoice cohort, not a reconstructed historical month-end balance.
- **Expenses** for the cash view are expenses whose status is `recorded` and
  whose `expense_date` falls in the selected month. Pending expenses are shown
  separately for management attention; void expenses are excluded.
- **Net cash flow** is completed payments by payment date minus recorded
  expenses by expense date for the selected month.

All IDR amounts remain integer values.

## Period behavior

The `period=YYYY-MM` URL parameter is shared by the Dashboard and Reports
pages. Available periods are derived from persisted invoice billing periods,
payment dates, and expense dates. An invalid or unavailable value falls back to
the latest persisted period.

Current occupancy, room rates, active rent value, vacant-room impact, and
maintenance attention are point-in-time operational values and therefore do
not change with the financial period selector.

## Maintenance and cash outflow

Maintenance `estimated_cost` and `actual_cost` are work-management fields.
They are never included automatically in expense or cash-flow totals. An
actual cash outflow is represented only by a persisted Expense record. This
prevents maintenance and expense records from counting the same outflow twice.

## Demo boundary

The seeded tenant identities, lease timing, invoices, payments, expenses, and
maintenance activity are fictional development data even though they are
persisted in Supabase. The reporting UI labels that boundary. Property identity,
room inventory, room configuration, current room status, and room rates are the
canonical owner-provided property state.

## Known limitation

The current schema stores current invoice state and payment events, but not
period-end balance snapshots. Historical outstanding figures therefore show
the current remaining balance for invoices from the selected period. A future
accounting requirement for historical “as of” reporting would need an explicit
auditable snapshot or event-ledger design.
