# Portfolio Edition Architecture

Grand Fina Property Management — Portfolio Edition is a modular monolith implemented as one Next.js 16.3.0 application. All example data described here are fictional.

## Boundaries

- `app/` owns App Router pages, layouts, metadata, actions, and composition.
- `components/` owns presentation and the smallest browser-interactive boundaries.
- `lib/data/` owns validation, application operations, database mapping, and framework-independent derivations.
- `lib/auth/` owns authentication and application authorization decisions.
- `lib/supabase/` isolates browser and server Supabase clients.
- `supabase/migrations/` owns schema, constraints, grants, functions, and RLS policies.

Server Components perform authenticated reads directly through the data layer. Server Actions validate inputs, enforce role authorization, execute mutations, and refresh affected routes. Internal pages do not call internal HTTP handlers.

## Request and authorization flow

```text
Browser
  -> Next.js route/layout
     -> Supabase Auth session
     -> profile + property membership lookup
     -> application role check
     -> RLS-protected PostgreSQL query
     -> localized Server Component output
```

Authentication establishes identity; membership establishes property access; role checks establish allowed operations. Database RLS remains the final isolation boundary.

## Domain integrity

- Every operational table is property-scoped.
- Money uses integer IDR values.
- Business dates are date-only; event timestamps are UTC and displayed for `Asia/Jayapura`.
- Active lease state is the occupancy source of truth.
- Cross-property references are blocked by composite foreign keys.
- Issued financial records use auditable status transitions rather than hard deletion.
- Dashboard and reports derive values from source records.

## Public demonstration topology

The repository can run locally with Next.js and a disposable Supabase stack. Vercel and managed Supabase are compatible target services, but this public repository makes no deployment claim.

## Deliberate non-goals

No microservices, event bus, generic repository layer, global client state, payment processing, tenant portal, or multi-property UI is included. These require demonstrated need and a recorded architecture decision.
