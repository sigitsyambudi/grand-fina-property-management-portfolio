import { spawnSync } from "node:child_process";

const GRAND_FINA_PROPERTY_ID = "00000000-0000-4000-8000-000000000001";
const CROSS_PROPERTY_ID = "ffffffff-ffff-4fff-8fff-fffffffff001";
const CROSS_PROPERTY_TENANT_ID = "ffffffff-ffff-4fff-8fff-fffffffff002";
const CROSS_PROPERTY_ROOM_ID = "ffffffff-ffff-4fff-8fff-fffffffff003";
const CROSS_PROPERTY_INVOICE_ID = "ffffffff-ffff-4fff-8fff-fffffffff005";
const TENANT_TEST_EMAILS = [
  "tenant-owner-validation@example.com",
  "tenant-admin-validation@example.com",
  "tenant-ui-validation@example.com",
  "lease-owner-conflict@example.com",
  "lease-admin-conflict@example.com",
  "lease-ui-validation@example.com",
];

export function escapeSqlLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

export function runLocalSql(sql, failureMessage) {
  const configuredCliPath = process.env.SUPABASE_CLI_PATH;
  const command =
    configuredCliPath ?? (process.platform === "win32" ? "npx.cmd" : "npx");
  const args = configuredCliPath
    ? ["db", "query", "--local"]
    : ["supabase", "db", "query", "--local"];
  const options = {
    cwd: process.cwd(),
    encoding: "utf8",
    input: sql,
  };
  const result =
    !configuredCliPath && process.platform === "win32"
      ? spawnSync(`${command} ${args.join(" ")}`, {
          ...options,
          shell: true,
        })
      : spawnSync(command, args, options);

  if (result.error || result.status !== 0) {
    const detail = [result.stderr, result.stdout]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(" ");
    throw new Error(failureMessage + (detail ? ` ${detail}` : ""));
  }
}

export function cleanupLocalDomainFixtures() {
  const fixtureEmails = TENANT_TEST_EMAILS.map(escapeSqlLiteral).join(", ");
  const sql = `
do $local_domain_cleanup$
begin
  delete from public.payments
  where property_id = ${escapeSqlLiteral(GRAND_FINA_PROPERTY_ID)}::uuid
    and notes like 'Fictional local Milestone 18 validation%';

  delete from public.invoices
  where property_id = ${escapeSqlLiteral(GRAND_FINA_PROPERTY_ID)}::uuid
    and notes like 'Fictional local Milestone 17 validation%';

  update public.rooms as room
  set status = 'available'
  where room.property_id = ${escapeSqlLiteral(GRAND_FINA_PROPERTY_ID)}::uuid
    and exists (
      select 1
      from public.leases as lease
      join public.tenants as tenant on tenant.id = lease.tenant_id
      where lease.property_id = room.property_id
        and lease.room_id = room.id
        and tenant.email in (${fixtureEmails})
    );

  delete from public.leases as lease
  where lease.property_id = ${escapeSqlLiteral(GRAND_FINA_PROPERTY_ID)}::uuid
    and lease.tenant_id in (
      select tenant.id
      from public.tenants as tenant
      where tenant.property_id = lease.property_id
        and tenant.email in (${fixtureEmails})
    )
    and not exists (
      select 1
      from public.invoices as invoice
      where invoice.lease_id = lease.id
    );

  delete from public.tenants as tenant
  where tenant.property_id = ${escapeSqlLiteral(GRAND_FINA_PROPERTY_ID)}::uuid
    and tenant.email in (${fixtureEmails})
    and not exists (
      select 1
      from public.leases as lease
      where lease.tenant_id = tenant.id
    );

  execute 'alter table public.expenses disable trigger expenses_enforce_write';
  delete from public.expenses
  where property_id = ${escapeSqlLiteral(GRAND_FINA_PROPERTY_ID)}::uuid
    and description ~ '^Fictional local Milestone 20 (owner|admin)( updated)? expense\\.$';
  execute 'alter table public.expenses enable trigger expenses_enforce_write';

  execute 'alter table public.maintenance_records disable trigger maintenance_records_enforce_write';
  delete from public.maintenance_records
  where property_id = ${escapeSqlLiteral(GRAND_FINA_PROPERTY_ID)}::uuid
    and title ~ '^Fictional Milestone 21 (owner|admin) (issue|cancellation)$';
  execute 'alter table public.maintenance_records enable trigger maintenance_records_enforce_write';

  delete from public.invoices
  where id = ${escapeSqlLiteral(CROSS_PROPERTY_INVOICE_ID)}::uuid
    and property_id = ${escapeSqlLiteral(CROSS_PROPERTY_ID)}::uuid;

  delete from public.leases
  where property_id = ${escapeSqlLiteral(CROSS_PROPERTY_ID)}::uuid;

  delete from public.tenants
  where id = ${escapeSqlLiteral(CROSS_PROPERTY_TENANT_ID)}::uuid
    and property_id = ${escapeSqlLiteral(CROSS_PROPERTY_ID)}::uuid;

  delete from public.rooms
  where id = ${escapeSqlLiteral(CROSS_PROPERTY_ROOM_ID)}::uuid
    and property_id = ${escapeSqlLiteral(CROSS_PROPERTY_ID)}::uuid;

  delete from public.properties
  where id = ${escapeSqlLiteral(CROSS_PROPERTY_ID)}::uuid
    and not exists (
      select 1
      from public.property_members
      where property_members.property_id = properties.id
    );
end
$local_domain_cleanup$;
`;

  runLocalSql(
    sql,
    "Could not restore canonical data after local authorization validation.",
  );
  console.log("Restored canonical local domain fixtures.");
}
