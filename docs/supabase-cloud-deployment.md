# Supabase Cloud manual bootstrap

This guide deploys the public, entirely fictional Grand Fina Property Management — Portfolio Edition dataset to a fresh Supabase Cloud project.

The SQL Editor workflow is a temporary deployment path because the Supabase CLI `link` command currently fails while parsing a Management API response in this environment. Migration-based deployment remains the preferred long-term workflow. The canonical schema history remains in `supabase/migrations/`; `supabase/cloud-bootstrap.sql` is only a one-time deployment bundle.

## Safety boundary

- Use a new, empty Supabase Cloud project dedicated to Portfolio Edition.
- Never run the bundle against the private Family Edition database.
- Run the bootstrap exactly once. It intentionally fails rather than hiding schema, constraint, foreign-key, grant, or RLS errors.
- The bundle contains no Auth users, passwords, API keys, database credentials, environment variables, localhost URLs, or private operational data.
- Do not add service-role credentials to browser-accessible or `NEXT_PUBLIC_` environment variables.

## Bootstrap the Cloud database

1. Create a fresh Supabase Cloud project.
2. Open **SQL Editor** in the project dashboard.
3. Open `supabase/cloud-bootstrap.sql` from this repository, paste the whole file into a new query, and run it once.
4. Confirm that the query commits successfully. If it fails, retain the exact error and do not rerun fragments against the partially investigated project.
5. Open `supabase/cloud-validation.sql`, paste the whole file into a new query, and run it.
6. Confirm that every result row reports `PASS` before creating demo Auth users.

The bootstrap creates the validated schema, constraints, functions, triggers, grants, RLS policies, Emerald Haven Residence property, canonical 24-room configuration, and fictional operational dataset. Profiles and property memberships remain empty until Cloud Auth users are created.

## Provision Cloud demo users separately

Create four fictional users through Supabase Authentication administration, not by inserting into `auth.users`:

- one Owner member;
- one Admin member;
- one Staff member;
- one authenticated non-member used for isolation testing.

Disable public sign-up for the internal demonstration deployment. Use unique Cloud-only credentials and do not reuse local test passwords.

After the users exist, copy their Auth user UUIDs from the Supabase dashboard. Replace the four placeholders below and run this transaction in SQL Editor. The authenticated non-member receives a profile but intentionally receives no property membership.

```sql
begin;

insert into public.profiles (id, display_name, role)
values
  ('1c5f3d34-5d68-405b-97ae-25a2697c8548'::uuid, 'Portfolio Demo Owner', 'owner'),
  ('e99959a5-c660-4e43-8822-9dcb850f20d4'::uuid, 'Portfolio Demo Admin', 'admin'),
  ('5f5e1381-7408-4afb-8f96-2019c9ebf8f6'::uuid, 'Portfolio Demo Staff', 'staff'),
  ('357c304e-137c-43ae-adab-773875e98e59'::uuid, 'Portfolio Demo Non-member', 'staff');

insert into public.property_members (property_id, profile_id, role)
values
  ('00000000-0000-4000-8000-000000000001'::uuid, '1c5f3d34-5d68-405b-97ae-25a2697c8548'::uuid, 'owner'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'e99959a5-c660-4e43-8822-9dcb850f20d4'::uuid, 'admin'),
  ('00000000-0000-4000-8000-000000000001'::uuid, '5f5e1381-7408-4afb-8f96-2019c9ebf8f6'::uuid, 'staff');

commit;
```

Do not add the non-member UUID to `property_members`.

Re-run `supabase/cloud-validation.sql` after provisioning. Check 24 accepts exactly the expected pre-provisioning state (zero profiles and memberships) or post-provisioning state (four profiles and three memberships); every check must report `PASS`. Validate the four personas through the deployed application:

- Owner can read and perform permitted writes.
- Admin can read and perform permitted writes.
- Staff can read property-scoped records but cannot write.
- The authenticated non-member cannot read Emerald Haven Residence data.
- Anonymous requests cannot read application-table data.
- No persona can access records outside its property membership.

## Configure and deploy Vercel

1. In Supabase project settings, obtain the **Project URL**.
2. Obtain the client-safe **Publishable Key**.
3. Configure these Vercel environment variables for the intended deployment environments:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

4. Never place the service-role key or database password in a `NEXT_PUBLIC_` variable. This application does not require a client-exposed administrative credential.
5. Deploy the application.
6. Perform production smoke testing for Login, Dashboard, Rooms, Tenants, Leases, Invoices, Payments, Expenses, Maintenance, Reports, Settings, About, Access Denied, and sign-out.
7. Repeat the Owner/Admin success cases and Staff/non-member/anonymous denied-access cases against the Cloud deployment.

## Returning to migration-based deployment

When the CLI Management API response issue is resolved, link the correct Portfolio Edition project, verify the target identity before any mutation, and resume deploying from `supabase/migrations/`. Do not treat the generated bootstrap bundle as a replacement migration history.
