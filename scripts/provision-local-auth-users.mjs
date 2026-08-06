import { createClient } from "@supabase/supabase-js";
import {
  cleanupLocalDomainFixtures,
  escapeSqlLiteral,
  runLocalSql,
} from "./local-auth-fixtures.mjs";

const GRAND_FINA_PROPERTY_ID = "00000000-0000-4000-8000-000000000001";
const CROSS_PROPERTY_ID = "ffffffff-ffff-4fff-8fff-fffffffff001";
const CROSS_PROPERTY_TENANT_ID = "ffffffff-ffff-4fff-8fff-fffffffff002";
const CROSS_PROPERTY_ROOM_ID = "ffffffff-ffff-4fff-8fff-fffffffff003";
const CROSS_PROPERTY_LEASE_ID = "ffffffff-ffff-4fff-8fff-fffffffff004";
const CROSS_PROPERTY_INVOICE_ID = "ffffffff-ffff-4fff-8fff-fffffffff005";
const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "localhost", "::1"]);
const TEST_IDENTITIES = [
  {
    email: "portfolio-owner@example.com",
    displayName: "Owner Test",
    role: "owner",
    isMember: true,
  },
  {
    email: "portfolio-admin@example.com",
    displayName: "Admin Test",
    role: "admin",
    isMember: true,
  },
  {
    email: "portfolio-staff@example.com",
    displayName: "Staff Test",
    role: "staff",
    isMember: true,
  },
  {
    email: "portfolio-nonmember@example.com",
    displayName: "Nonmember Test",
    role: "staff",
    isMember: false,
  },
];

function requireLocalConfiguration() {
  const rawUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const password = process.env.GF_LOCAL_TEST_PASSWORD;

  if (!rawUrl || !serviceRoleKey) {
    throw new Error(
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the local Supabase environment.",
    );
  }

  const url = new URL(rawUrl);
  if (!LOCAL_HOSTNAMES.has(url.hostname)) {
    throw new Error(
      "Refusing to provision test identities outside a local Supabase environment.",
    );
  }

  if (!process.argv.includes("--cleanup") && (!password || password.length < 12)) {
    throw new Error(
      "Set GF_LOCAL_TEST_PASSWORD to a temporary local-only value with at least 12 characters.",
    );
  }

  return { url: url.toString(), serviceRoleKey, password };
}

async function listTestUsers(supabase) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw error;
  }

  const testEmails = new Set(TEST_IDENTITIES.map(({ email }) => email));
  return data.users.filter((user) => user.email && testEmails.has(user.email));
}

async function cleanupTestUsers(supabase) {
  const testUsers = await listTestUsers(supabase);

  for (const user of testUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      throw error;
    }
  }

  console.log(`Removed ${testUsers.length} local authentication test identities.`);
}

function cleanupTenantValidationFixtures() {
  cleanupLocalDomainFixtures();
}

function applyProfileAndMembershipFixtures(users) {
  const profileValues = users
    .map(({ id, identity }) => {
      if (!/^[0-9a-f-]{36}$/i.test(id)) {
        throw new Error("The local Auth API returned an invalid user identifier.");
      }

      return `(${escapeSqlLiteral(id)}::uuid, ${escapeSqlLiteral(
        identity.displayName,
      )}, ${escapeSqlLiteral(identity.role)})`;
    })
    .join(",\n");
  const membershipValues = users
    .filter(({ identity }) => identity.isMember)
    .map(
      ({ id, identity }) =>
        `(${escapeSqlLiteral(GRAND_FINA_PROPERTY_ID)}::uuid, ` +
        `${escapeSqlLiteral(id)}::uuid, ${escapeSqlLiteral(identity.role)})`,
    )
    .join(",\n");
  const nonmemberIds = users
    .filter(({ identity }) => !identity.isMember)
    .map(({ id }) => `${escapeSqlLiteral(id)}::uuid`)
    .join(", ");
  const sql = `
do $local_auth_fixtures$
begin
  insert into public.properties (id, name, timezone, currency_code)
  values (
    ${escapeSqlLiteral(CROSS_PROPERTY_ID)}::uuid,
    'Fictional Cross-Property Validation',
    'Asia/Jayapura',
    'IDR'
  )
  on conflict (id) do update
  set
    name = excluded.name,
    timezone = excluded.timezone,
    currency_code = excluded.currency_code;

  insert into public.rooms (
    id,
    property_id,
    room_number,
    location,
    floor,
    monthly_rate,
    status,
    sort_order
  )
  values (
    ${escapeSqlLiteral(CROSS_PROPERTY_ROOM_ID)}::uuid,
    ${escapeSqlLiteral(CROSS_PROPERTY_ID)}::uuid,
    'TEST',
    'South Wing',
    1,
    2135000,
    'available',
    1
  )
  on conflict (id) do update
  set
    property_id = excluded.property_id,
    room_number = excluded.room_number,
    location = excluded.location,
    floor = excluded.floor,
    monthly_rate = excluded.monthly_rate,
    status = excluded.status,
    sort_order = excluded.sort_order;

  insert into public.tenants (
    id,
    property_id,
    full_name,
    email,
    status,
    notes
  )
  values (
    ${escapeSqlLiteral(CROSS_PROPERTY_TENANT_ID)}::uuid,
    ${escapeSqlLiteral(CROSS_PROPERTY_ID)}::uuid,
    'Fictional Cross-Property Tenant',
    'cross-property-validation@example.com',
    'pending',
    'Fictional local-only cross-property validation fixture.'
  )
  on conflict (id) do update
  set
    property_id = excluded.property_id,
    full_name = excluded.full_name,
    email = excluded.email,
    status = excluded.status,
    notes = excluded.notes;

  insert into public.leases (
    id,
    property_id,
    tenant_id,
    room_id,
    status,
    start_date,
    end_date,
    monthly_rent,
    billing_day,
    notes
  )
  values (
    ${escapeSqlLiteral(CROSS_PROPERTY_LEASE_ID)}::uuid,
    ${escapeSqlLiteral(CROSS_PROPERTY_ID)}::uuid,
    ${escapeSqlLiteral(CROSS_PROPERTY_TENANT_ID)}::uuid,
    ${escapeSqlLiteral(CROSS_PROPERTY_ROOM_ID)}::uuid,
    'active',
    date '2026-01-01',
    date '2027-12-31',
    2135000,
    5,
    'Fictional local-only cross-property validation lease.'
  )
  on conflict (id) do nothing;

  insert into public.invoices (
    id,
    property_id,
    lease_id,
    reference,
    billing_period,
    issue_date,
    due_date,
    amount,
    status,
    notes
  )
  values (
    ${escapeSqlLiteral(CROSS_PROPERTY_INVOICE_ID)}::uuid,
    ${escapeSqlLiteral(CROSS_PROPERTY_ID)}::uuid,
    ${escapeSqlLiteral(CROSS_PROPERTY_LEASE_ID)}::uuid,
    'EH-INV-CROSS-VALIDATION',
    date '2026-07-01',
    date '2026-06-25',
    date '2026-07-05',
    2135000,
    'issued',
    'Fictional local cross-property payment validation invoice.'
  )
  on conflict (id) do nothing;

  insert into public.profiles (id, display_name, role)
  values
  ${profileValues}
  on conflict (id) do update
  set display_name = excluded.display_name, role = excluded.role;

  insert into public.property_members (property_id, profile_id, role)
  values
  ${membershipValues}
  on conflict (property_id, profile_id) do update
  set role = excluded.role;

  delete from public.property_members
  where property_id = ${escapeSqlLiteral(GRAND_FINA_PROPERTY_ID)}::uuid
    and profile_id in (${nonmemberIds});
end
$local_auth_fixtures$;
`;

  runLocalSql(
    sql,
    "Could not apply local profile and membership fixtures through the Supabase CLI.",
  );
}

async function provisionTestUsers(supabase, password) {
  const existingUsers = await listTestUsers(supabase);
  const usersByEmail = new Map(
    existingUsers.map((user) => [user.email, user]),
  );
  const provisionedUsers = [];

  for (const identity of TEST_IDENTITIES) {
    const existingUser = usersByEmail.get(identity.email);
    const userResult = existingUser
      ? await supabase.auth.admin.updateUserById(existingUser.id, {
          password,
          email_confirm: true,
        })
      : await supabase.auth.admin.createUser({
          email: identity.email,
          password,
          email_confirm: true,
        });

    if (userResult.error || !userResult.data.user) {
      throw userResult.error ?? new Error(`Could not create ${identity.email}.`);
    }

    const userId = userResult.data.user.id;
    provisionedUsers.push({ id: userId, identity });
  }

  applyProfileAndMembershipFixtures(provisionedUsers);

  for (const { identity } of provisionedUsers) {
    console.log(`${identity.email}: ${identity.isMember ? identity.role : "authenticated non-member"}`);
  }
}

const configuration = requireLocalConfiguration();
const supabase = createClient(
  configuration.url,
  configuration.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

if (process.argv.includes("--cleanup")) {
  cleanupTenantValidationFixtures();
  await cleanupTestUsers(supabase);
} else {
  cleanupTenantValidationFixtures();
  await provisionTestUsers(supabase, configuration.password);
}
