# Grand Fina Property Management — Portfolio Edition Technical Blueprint

## Purpose

This public portfolio edition demonstrates a production-oriented property management architecture without exposing the private internal-use project's data or history. Every checked-in identity, property configuration, room, tenant, lease, invoice, payment, expense, maintenance record, and financial value is fictional.

## Implemented stack

Read exact versions from `package.json` and `package-lock.json`. The current installed baseline is Next.js 16.3.0 with App Router, React 19, strict TypeScript, Tailwind CSS, ESLint, Supabase PostgreSQL/Auth, and property-scoped RLS.

## Architecture

Use a modular monolith. App Router entry points remain thin; application operations enforce authorization, validation, and workflow rules; pure domain calculations remain independent of React, Next.js, and Supabase; database access remains server-first and isolated.

Prefer Server Components. Use Client Components only at the smallest browser-interactive boundary. Use Route Handlers for stable external contracts, exports, file delivery, or webhooks—not as an internal data layer.

## Fictional portfolio model

- Property: Emerald Haven Residence
- Type: Managed Residential Rental
- Rooms: 24, numbered A01–A12 and B01–B12
- Buildings: North Wing and South Wing
- Floors: Floor 1 and Floor 2
- Occupancy: 20 occupied, 3 available, 1 maintenance
- Currency: integer IDR values
- Event timezone: UTC storage, Asia/Jayapura display

## Domain rules

- Keep business data property-scoped.
- Prevent overlapping active leases for a room or tenant.
- Derive occupancy relationships from active leases.
- Generate monthly invoices idempotently.
- Prevent payments from exceeding invoice balances.
- Preserve issued financial records with auditable void/reversal flows.
- Use transactions for multi-write financial and occupancy transitions.
- Define report accounting semantics and derive from source records.

## Security

Authentication identifies a user; property membership and roles authorize use cases; RLS enforces isolation again in PostgreSQL. Anonymous table access is denied. Server input validation, private Storage, short-lived signed URLs, redacted errors, safe logs, and environment separation remain mandatory.

## Testing

Unit-test money, dates, lease overlap, billing, balances, and state transitions. Integration-test migrations, constraints, functions, RLS, and denied access against a disposable environment. End-to-end test critical owner/admin/staff workflows and permission failures with only fictional fixtures.

## Out of scope

Do not add payment processing, a tenant portal, multi-property UI, microservices, an event bus, generic repositories, or background infrastructure without an approved need and architecture decision.

## Public release rule

Before a public commit, lint, type-check, build, database validations, locale key parity, dependency audit, secret scan, privacy scan, and Git history/status checks must pass. Stale screenshots remain excluded until regenerated from the fictional local dataset.
