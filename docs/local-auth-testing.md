# Local authentication testing

Milestone 12 uses four repeatable, fictional identities to validate the current
role and membership boundary:

| Identity | Profile role | Emerald Haven Residence membership |
| --- | --- | --- |
| `portfolio-owner@example.com` | owner | member |
| `portfolio-admin@example.com` | admin | member |
| `portfolio-staff@example.com` | staff | member |
| `portfolio-nonmember@example.com` | staff | none |

These identities are local validation fixtures only. They are not seeded by a
migration and must not be copied to a hosted environment.

## Prerequisites

1. Start the local stack with `npx supabase start`.
2. Configure `.env.local` with the local API URL and browser-safe anonymous or
   publishable key described by `.env.example`.
3. Read the local service-role key from `npx supabase status -o env` and place it
   only in the current terminal process. Do not put it in `.env.local`.
4. Choose a temporary fictional test password of at least 12 characters.

In PowerShell:

```powershell
$env:SUPABASE_URL = "http://127.0.0.1:54321"
$env:SUPABASE_SERVICE_ROLE_KEY = "<local service-role key>"
$env:GF_LOCAL_TEST_PASSWORD = "<temporary local-only password>"
npm run auth:test-users
```

The provisioning command refuses any Supabase hostname other than localhost.
It creates or updates the four Auth users, their own profiles, and only the
three expected fictional property memberships. Because application RLS is intentionally
SELECT-only, fixture profile and membership rows are applied through
`supabase db query --local`, never through a browser or authenticated
application client. It does not change property-domain records.

The script uses `npx supabase` by default. A local Supabase executable can be
selected without changing the repository:

```powershell
$env:SUPABASE_CLI_PATH = "<absolute path to the local Supabase CLI executable>"
```

Run the automated RLS behavior matrix with the local publishable key:

```powershell
$env:SUPABASE_PUBLISHABLE_KEY = "<local publishable key>"
npm run auth:validate:local
```

This verifies anonymous isolation, all three member roles, non-member
isolation, cross-user profile and membership isolation, SELECT-only write
protection, and disabled public registration.

The validator selects writable domain fixtures from the current fictional
dataset and restores all local-only tenant, lease, invoice, payment, expense,
maintenance, room-status, and cross-property fixtures before it exits. The
restoration also runs after a failed assertion so repeated validation starts
from the canonical seed state. Authentication personas remain available until
the explicit cleanup command below is run.

## Validation matrix

- With no session, visit `/`, `/rooms`, and a detail route. Each must redirect
  to `/login`.
- Sign in as owner, administrator, and staff. Each current role can open the
  read-only workspace, sees its real profile name and role, and can sign out.
- Sign in as the non-member identity. Authentication succeeds, but the
  workspace shows the property-access-unavailable state and exposes no Emerald
  Haven Residence records.
- With a valid member session, visiting `/login` redirects to `/`.
- Switching ID/EN on `/login` changes the form and safe error messages.

The role helper is centralized in `lib/auth/access.ts`. Milestone 12 does not
invent granular permissions: owner, administrator, and staff all receive the
same existing read-only workspace access after membership is verified. RLS
continues to authorize property data at the database layer.

## Cleanup

Remove the temporary identities after validation:

```powershell
npm run auth:test-users:cleanup
Remove-Item Env:GF_LOCAL_TEST_PASSWORD
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
Remove-Item Env:SUPABASE_CLI_PATH -ErrorAction SilentlyContinue
```

Profile and membership rows are removed through their existing Auth user
cascade. Re-run `supabase/tests/validate_canonical_seed.sql` to verify canonical
property data remains unchanged.

Public registration is disabled in the local Supabase configuration. Apply the
same setting separately in the hosted Supabase Auth configuration before
production deployment.
