# Portfolio Edition Database

The PostgreSQL schema preserves the private project's engineering model while all checked-in data are public-safe and fictional.

## Core tables

| Area | Tables |
|---|---|
| Identity and scope | `profiles`, `properties`, `property_members` |
| Operations | `rooms`, `tenants`, `leases` |
| Billing and cash | `invoices`, `payments`, `expenses` |
| Maintenance | `maintenance_records` |

All business tables are scoped by `property_id`. Composite keys and foreign keys prevent records from crossing property boundaries.

## Fictional canonical property

- Name: Emerald Haven Residence
- Type: Managed Residential Rental
- Timezone: Asia/Jayapura
- Currency: IDR
- Rooms: A01–A12 in North Wing and B01–B12 in South Wing
- Floors: Floor 1 and Floor 2
- State: 20 occupied, 3 available, 1 maintenance

Rates and all derived totals are demonstration values. `supabase/tests/validate_canonical_seed.sql` asserts the room plan, state distribution, and reconciled rate totals.

## Integrity and lifecycle rules

- Room numbers are unique per property.
- Active room and tenant leases are unique and cross-property links are rejected.
- Lease dates, billing days, positive monetary amounts, and finite statuses are constrained.
- One invoice exists per lease and billing period.
- Payment amounts cannot exceed their invoice amount through the approved mutation path.
- Expenses and maintenance records retain auditable void/cancel states.
- Room status changes are restricted so occupancy cannot silently diverge from active leases.

## Seed and validation order

`supabase/seed.sql` creates the public property and rooms. `supabase/seed-demo.sql` adds fictional tenants, leases, invoices, payments, expenses, and maintenance records. Validation scripts confirm canonical configuration, relational consistency, report totals, and partial/full/unpaid billing scenarios.

The schema is recreated locally with `supabase db reset --local`. This must never be aimed at a shared or production database.
