# Grand Fina Property Management — Portfolio Edition Case Study

## Context

This public project demonstrates how a property-management workflow can be modeled as a secure, production-oriented modular monolith. It is derived from the architecture of a private internal-use project, but no private property configuration, people, metrics, screenshots, credentials, or Git history are included.

Every displayed operational and financial value is fictional. The demonstration property, Emerald Haven Residence, has a synthetic 24-room plan and a reconciled dataset designed specifically for this repository.

## Engineering challenge

Property operations connect occupancy, leases, billing, payments, expenses, and maintenance. Treating these as independent CRUD screens creates conflicting sources of truth. The implementation instead centers domain invariants:

- active leases control occupancy relationships;
- monthly invoices are unique per lease and period;
- payments remain within invoice balances;
- financial corrections retain an audit trail;
- all records remain property-scoped;
- authorization is enforced in application code and RLS.

## Solution

The application uses Next.js 16.3.0, React 19, strict TypeScript, Tailwind CSS, Supabase Auth, PostgreSQL, and RLS. Server Components handle reads, Server Actions handle validated mutations, and pure derivation functions produce dashboard and reporting views.

English and Indonesian dictionaries share a typed key set. The UI supports desktop and mobile layouts, keyboard interaction, visible focus, loading/error/empty/denied states, and server-confirmed financial writes.

## Demonstrated outcomes

- coherent room, tenant, lease, invoice, payment, expense, and maintenance workflows;
- property membership and multi-role authorization boundaries;
- database constraints and RLS policies tested against allowed and denied cases;
- reconciled fictional dashboard and reporting totals;
- public-safe seeds, documentation, and examples;
- security headers and dependency validation suitable for a production-oriented portfolio.

This is evidence of engineering approach and implementation quality, not a claim that the public edition is deployed or approved for live operations.
