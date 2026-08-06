# AGENTS.md — Grand Fina Property Management System

## Project context

Grand Fina is a production-oriented public portfolio project using the entirely
fictional 24-room Emerald Haven Residence dataset.

Core capabilities:

- Manage rooms, tenants, and leases.
- Generate and track monthly invoices.
- Record and allocate rent payments.
- Track expenses and maintenance.
- Provide operational and financial reporting.

Target stack:

- Next.js with App Router
- TypeScript
- Tailwind CSS
- ESLint
- Supabase PostgreSQL, Auth, and Storage
- Vercel

The repository is an existing create-next-app project on the `main` branch and has
been pushed to GitHub. It currently uses the standard root-level `app/` structure
without a `src/` directory. Existing project files include `app/`, `public/`,
`.gitignore`, `CLAUDE.md`, `README.md`, `eslint.config.mjs`, `next.config.ts`,
`package.json`, `package-lock.json`, `postcss.config.mjs`, and `tsconfig.json`.

Read `docs/technical-blueprint.md` before making architectural or feature changes.
Inspect the checked-out files and package metadata for exact framework versions and
current configuration; do not infer them from this document.

## Current scope boundary

The current phase is architecture documentation only.

Unless a later user request explicitly changes scope, do not:

- Implement Supabase or create migrations.
- Build UI pages or business features.
- Add or upgrade dependencies.
- Invent a tenant portal, online payment processing, multi-property UI, or other
  post-MVP capability.

When implementation is authorized, make the smallest coherent change required by
the requested milestone. Do not pre-build later milestones.

## Architecture

Use a modular monolith in one Next.js application.

- The current application uses root-level `app/`. Preserve that layout during the
  documentation phase and do not move files merely to match the future target.
- When feature implementation begins, `src/app`, `src/modules/<feature>`,
  `src/components`, and `src/lib` are the proposed modular target.
- Migration from root-level `app/` to `src/` should happen only when implementation
  begins and only if the change provides clear organizational value. Make it a
  deliberate, separately reviewable change rather than mixing it into a business
  feature.
- In the future target, `src/app` owns routing, layouts, framework entry points, and
  composition.
- `src/modules/<feature>` owns business-specific domain, application, data, and UI
  code; `src/components/ui` contains reusable visual primitives without business
  rules; and `src/lib` contains narrowly scoped cross-cutting infrastructure.
- Supabase access is server-first and isolated behind module data access or
  infrastructure adapters.
- UI calls application use cases; application use cases enforce authorization,
  validation, transactions, and domain rules.
- Domain calculations must not depend on React, Next.js, or Supabase.
- Route Handlers are for webhooks, exports, file delivery, or stable HTTP
  integration contracts—not a default internal data layer.
- Prefer Server Components. Introduce Client Components only at the smallest
  browser-interactive boundary.

Do not introduce microservices, generic repositories, an event bus, global client
state, or background-job infrastructure without a demonstrated need and a recorded
architecture decision.

## Domain rules

- The fictional portfolio property has exactly 24 rooms, but persistent business data should be
  property-scoped where ownership would otherwise be ambiguous.
- Store IDR money as integer values; never use floating-point math for money.
- Store event timestamps in UTC and display them in `Asia/Jayapura`.
- Use date-only values for lease dates, due dates, and billing periods.
- Keep room occupancy consistent with lease state. Do not create an independently
  editable competing source of truth.
- Prevent overlapping active leases for the same room.
- Monthly invoice generation must be idempotent.
- Payments may be partially or fully allocated to invoices. Allocation cannot
  exceed the effective payment amount or invoice balance.
- Issued invoices, payments, allocations, and expenses are not hard-deleted.
  Correct them with auditable void/reversal flows.
- Financial and occupancy state transitions requiring multiple writes must be
  transactional.
- Reports must define their accounting semantics and derive from authoritative
  source records.

Do not silently decide unresolved business policy. Consult the “Decisions to resolve
before implementation” section of the blueprint and ask the user when a choice
would materially alter behavior or data design.

## Security and privacy rules

- Treat tenant identity, contact, emergency-contact, lease, and document data as
  sensitive.
- Collect and return only the fields required for the use case.
- Never put PII or secrets in URLs, logs, analytics, cache keys, error messages,
  filenames, fixtures, screenshots, or commits.
- Use fictitious data in development and tests.
- Disable public sign-up for the initial internal deployment.
- Enforce authorization in application code and Row Level Security. Client-side
  checks and hidden navigation are not authorization.
- Scope database access by property membership.
- The Supabase service-role key is server-only, never public, and not a substitute
  for RLS. Keep any admin client isolated and exceptional.
- Storage buckets containing tenant, lease, payment, expense, or maintenance files
  must be private. Validate file ownership, type, and size; use short-lived signed
  URLs.
- The initial application records payments only. Never store card numbers, CVV,
  banking credentials, or payment-provider secrets.
- Validate all untrusted input on the server.
- Use transactions, constraints, idempotency, and audit events for financial
  workflows.
- Preserve audit history while excluding secrets and unnecessary PII.
- Neutralize spreadsheet-formula prefixes in exported CSV/spreadsheet values.
- Keep production, staging/preview, and local credentials and data separate.

Security-sensitive changes require tests for denied access as well as successful
access.

## TypeScript and React conventions

- Keep TypeScript strict. Do not use `any`; narrow `unknown` at trust boundaries.
- Use string-literal unions or schema-derived types for finite states, not
  TypeScript `enum`.
- Prefer named exports except where Next.js requires a default export.
- Never hand-edit generated database types.
- Avoid non-null assertions and unsafe type casts.
- Use `kebab-case` for files/folders, `PascalCase` for React components and types,
  `camelCase` for variables/functions, and `UPPER_SNAKE_CASE` for true constants.
- Name business operations explicitly, such as `issueInvoice` and
  `allocatePayment`.
- Keep pages, layouts, actions, and handlers thin; place business rules in the
  owning module.
- Do not import server-only code into Client Components.
- Do not make Server Components call internal Route Handlers; call the application
  layer directly.
- Use URL state for shareable filters, pagination, and report periods.
- Provide loading, empty, error, and permission-denied states.
- Build accessible semantic UI with labels, keyboard support, visible focus, and
  sufficient contrast.
- Do not present an optimistic financial write as final before server confirmation.

## Validation, errors, and observability

- Validate forms, JSON, environment variables, route parameters, and webhook bodies
  at runtime on the server.
- Return typed results for expected domain failures and use exceptions for
  exceptional failures.
- Show safe user-facing errors; log redacted technical context with an opaque
  correlation ID.
- Do not swallow errors.
- Never log authorization tokens, signed URLs, request cookies, raw tenant records,
  or sensitive document metadata.

## Testing expectations

- Unit-test money, dates, lease overlap, invoice generation, balances, and status
  transitions.
- Integration-test database constraints, transactions, RLS, storage policies, and
  repositories against a disposable environment.
- End-to-end test critical owner workflows and permission failures.
- Add a regression test for every fixed defect when practical.
- Include month/year boundary and `Asia/Jayapura` display cases.
- Never use copied production tenant data in tests.

Run the repository's relevant lint, type-check, and test commands after code changes.
If a command or framework baseline does not exist yet, report that fact rather than
claiming verification.

## Change discipline

- Inspect existing code and nearby tests before editing.
- Preserve user changes and avoid unrelated refactors.
- Keep domain language aligned with the blueprint.
- Add dependencies only when explicitly authorized and justified by a current use
  case.
- Create migrations only when explicitly authorized. Never rewrite an applied
  production migration; add a forward migration.
- Document consequential architecture, security, or accounting decisions under
  `docs/decisions/`.
- Update the blueprint and this file when an approved decision changes their
  guidance.
- Treat the checked-out source and package metadata as the authority for exact
  framework versions, scripts, and implemented features.

## Definition of done for future implementation work

A change is complete only when:

- The requested behavior and scope are satisfied.
- Authorization and server-side validation are present.
- Domain invariants are protected at appropriate application/database boundaries.
- Relevant success, failure, and permission tests pass.
- Lint and type checks pass.
- No PII, secrets, generated artifacts, or unrelated files are introduced.
- Documentation is updated when behavior, operations, or architecture changed.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
