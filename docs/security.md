# Portfolio Edition Security

This public edition demonstrates defense in depth with entirely fictional data. It does not include credentials, private tenant information, or a deployment claim.

## Controls

- Supabase Auth establishes the session identity.
- Profiles and property memberships determine application access.
- Owner, administrator, and staff roles are checked in application operations.
- Row Level Security restricts every application table by property membership.
- Anonymous users receive no application-table access.
- Server-side runtime validation rejects malformed or unexpected fields.
- Cross-property composite foreign keys protect relational isolation.
- Financial and occupancy workflows use constraints and transactional database functions where multiple records must remain consistent.
- Browser code uses only public Supabase configuration; service-role credentials remain exceptional, local/server-only, and absent from the repository.

## Role boundary

| Capability | Owner | Admin | Staff | Authenticated non-member |
|---|---:|---:|---:|---:|
| Read assigned property | Yes | Yes | Yes | No |
| Manage rooms and core records | Yes | Yes | Restricted | No |
| Change roles or membership | Controlled workflow | Controlled workflow | No | No |

Validation includes successful reads/writes and denied non-member or role-restricted operations.

## Sensitive-data rules

Production tenant data must never enter fixtures, screenshots, logs, URLs, analytics, filenames, or commits. Private Storage buckets, short-lived signed URLs, upload validation, and explicit authorization are required before document uploads are introduced.

## HTTP hardening

`next.config.ts` defines CSP, referrer, MIME-sniffing, permissions, framing, and production HTTPS transport headers. CSP permits the application itself and HTTPS Supabase endpoints while avoiding broad third-party script origins.

## Reporting and exports

Financial reports derive from authoritative invoices, completed payments, and recorded expenses. Future CSV exports must neutralize spreadsheet-formula prefixes and exclude fields not required by the export use case.
