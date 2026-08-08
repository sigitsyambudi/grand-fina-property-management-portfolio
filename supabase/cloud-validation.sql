-- Grand Fina Property Management — Portfolio Edition
-- Read-only Supabase Cloud validation
--
-- Run in the Supabase Cloud SQL Editor after cloud-bootstrap.sql completes.
-- This script performs catalog and aggregate reads only. It does not mutate data.

with
portfolio as (
  select '00000000-0000-4000-8000-000000000001'::uuid as property_id
),
application_tables(table_name) as (
  values
    ('profiles'),
    ('properties'),
    ('property_members'),
    ('rooms'),
    ('tenants'),
    ('leases'),
    ('invoices'),
    ('payments'),
    ('expenses'),
    ('maintenance_records')
),
expected_rooms(room_number) as (
  values
    ('A01'), ('A02'), ('A03'), ('A04'), ('A05'), ('A06'),
    ('A07'), ('A08'), ('A09'), ('A10'), ('A11'), ('A12'),
    ('B01'), ('B02'), ('B03'), ('B04'), ('B05'), ('B06'),
    ('B07'), ('B08'), ('B09'), ('B10'), ('B11'), ('B12')
),
expected_policies(table_name, policy_name) as (
  values
    ('profiles', 'Users can read their own profile'),
    ('properties', 'Members can read their properties'),
    ('property_members', 'Users can read their own property memberships'),
    ('rooms', 'Members can read property rooms'),
    ('tenants', 'Members can read property tenants'),
    ('leases', 'Members can read property leases'),
    ('invoices', 'Members can read property invoices'),
    ('payments', 'Members can read property payments'),
    ('expenses', 'Members can read property expenses'),
    ('maintenance_records', 'Members can read property maintenance'),
    ('rooms', 'Owners and admins can update room configuration'),
    ('tenants', 'Owners and admins can create pending tenants'),
    ('tenants', 'Owners and admins can update tenant profiles'),
    ('leases', 'Owners and admins can create active leases'),
    ('leases', 'Owners and admins can update active lease terms'),
    ('invoices', 'Owners and admins can create invoices'),
    ('invoices', 'Owners and admins can update safe invoice fields'),
    ('payments', 'Owners and admins can create payments'),
    ('payments', 'Owners and admins can update payment notes'),
    ('expenses', 'Owners and admins can create expenses'),
    ('expenses', 'Owners and admins can update expenses'),
    ('maintenance_records', 'Owners and admins can create maintenance'),
    ('maintenance_records', 'Owners and admins can update maintenance')
),
completed_by_invoice as (
  select payment.invoice_id, sum(payment.amount) as paid_amount
  from public.payments as payment
  cross join portfolio
  where payment.property_id = portfolio.property_id
    and payment.status = 'completed'
  group by payment.invoice_id
),
metrics as (
  select
    (select count(*) from public.rooms as room cross join portfolio where room.property_id = portfolio.property_id) as room_count,
    (select count(*) from public.rooms as room cross join portfolio where room.property_id = portfolio.property_id and room.status = 'occupied') as occupied_count,
    (select count(*) from public.rooms as room cross join portfolio where room.property_id = portfolio.property_id and room.status = 'available') as available_count,
    (select count(*) from public.rooms as room cross join portfolio where room.property_id = portfolio.property_id and room.status = 'maintenance') as maintenance_count,
    (select coalesce(sum(room.monthly_rate), 0) from public.rooms as room cross join portfolio where room.property_id = portfolio.property_id) as full_monthly_potential,
    (select coalesce(sum(lease.monthly_rent), 0) from public.leases as lease cross join portfolio where lease.property_id = portfolio.property_id and lease.status = 'active') as active_lease_value,
    (select coalesce(sum(room.monthly_rate), 0) from public.rooms as room cross join portfolio where room.property_id = portfolio.property_id and room.status = 'available') as vacancy_impact,
    (select coalesce(sum(room.monthly_rate), 0) from public.rooms as room cross join portfolio where room.property_id = portfolio.property_id and room.status = 'maintenance') as maintenance_room_value,
    (select coalesce(sum(invoice.amount), 0) from public.invoices as invoice cross join portfolio where invoice.property_id = portfolio.property_id and invoice.billing_period = date '2026-07-01') as billed_amount,
    (select coalesce(sum(payment.amount), 0) from public.payments as payment cross join portfolio where payment.property_id = portfolio.property_id and payment.status = 'completed') as completed_payments,
    (
      select coalesce(sum(invoice.amount - coalesce(payment.paid_amount, 0)), 0)
      from public.invoices as invoice
      cross join portfolio
      left join completed_by_invoice as payment on payment.invoice_id = invoice.id
      where invoice.property_id = portfolio.property_id
        and invoice.billing_period = date '2026-07-01'
        and invoice.status <> 'void'
    ) as outstanding_balance,
    (select coalesce(sum(expense.amount), 0) from public.expenses as expense cross join portfolio where expense.property_id = portfolio.property_id and expense.status = 'recorded') as recorded_expenses
),
checks(sort_order, check_name, passed, expected, actual) as (
  select 1, 'Application table count',
    count(*) = 10,
    '10', count(*)::text
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  join application_tables as expected on expected.table_name = relation.relname
  where namespace.nspname = 'public' and relation.relkind = 'r'

  union all
  select 2, 'RLS enabled on every application table',
    count(*) filter (where relation.relrowsecurity) = 10,
    '10 of 10',
    (count(*) filter (where relation.relrowsecurity))::text || ' of 10'
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  join application_tables as expected on expected.table_name = relation.relname
  where namespace.nspname = 'public' and relation.relkind = 'r'

  union all
  select 3, 'Portfolio property identity',
    count(*) = 1,
    'Emerald Haven Residence',
    coalesce(string_agg(property.name, ', '), 'missing')
  from public.properties as property
  cross join portfolio
  where property.id = portfolio.property_id
    and property.name = 'Emerald Haven Residence'

  union all
  select 4, 'Room count', metrics.room_count = 24, '24', metrics.room_count::text from metrics

  union all
  select 5, 'Room numbers are exactly A01–A12 and B01–B12',
    not exists (
      select room_number from expected_rooms
      except
      select room.room_number from public.rooms as room cross join portfolio where room.property_id = portfolio.property_id
    )
    and not exists (
      select room.room_number from public.rooms as room cross join portfolio where room.property_id = portfolio.property_id
      except
      select room_number from expected_rooms
    ),
    'A01–A12, B01–B12',
    coalesce((select string_agg(room.room_number, ', ' order by room.sort_order) from public.rooms as room cross join portfolio where room.property_id = portfolio.property_id), 'none')

  union all
  select 6, 'Canonical wing/floor mapping',
    count(*) filter (
      where not (
        (room.room_number between 'A01' and 'A06' and room.location = 'North Wing' and room.floor = 1)
        or (room.room_number between 'A07' and 'A12' and room.location = 'North Wing' and room.floor = 2)
        or (room.room_number between 'B01' and 'B06' and room.location = 'South Wing' and room.floor = 1)
        or (room.room_number between 'B07' and 'B12' and room.location = 'South Wing' and room.floor = 2)
      )
    ) = 0,
    '0 invalid mappings',
    (count(*) filter (
      where not (
        (room.room_number between 'A01' and 'A06' and room.location = 'North Wing' and room.floor = 1)
        or (room.room_number between 'A07' and 'A12' and room.location = 'North Wing' and room.floor = 2)
        or (room.room_number between 'B01' and 'B06' and room.location = 'South Wing' and room.floor = 1)
        or (room.room_number between 'B07' and 'B12' and room.location = 'South Wing' and room.floor = 2)
      )
    ))::text || ' invalid mappings'
  from public.rooms as room cross join portfolio
  where room.property_id = portfolio.property_id

  union all
  select 7, 'Room operational states',
    metrics.occupied_count = 20 and metrics.available_count = 3 and metrics.maintenance_count = 1,
    'occupied=20, available=3, maintenance=1',
    format('occupied=%s, available=%s, maintenance=%s', metrics.occupied_count, metrics.available_count, metrics.maintenance_count)
  from metrics

  union all
  select 8, 'Occupancy calculation',
    round(100.0 * metrics.occupied_count / nullif(metrics.room_count, 0), 2) = 83.33,
    '83.33%',
    coalesce(round(100.0 * metrics.occupied_count / nullif(metrics.room_count, 0), 2)::text || '%', 'undefined')
  from metrics

  union all
  select 9, 'Full monthly potential', metrics.full_monthly_potential = 57300000, '57300000', metrics.full_monthly_potential::text from metrics

  union all
  select 10, 'Active lease value', metrics.active_lease_value = 46875000, '46875000', metrics.active_lease_value::text from metrics

  union all
  select 11, 'Vacancy impact', metrics.vacancy_impact = 7750000, '7750000', metrics.vacancy_impact::text from metrics

  union all
  select 12, 'Maintenance-room value', metrics.maintenance_room_value = 2675000, '2675000', metrics.maintenance_room_value::text from metrics

  union all
  select 13, 'July 2026 billed amount', metrics.billed_amount = 46875000, '46875000', metrics.billed_amount::text from metrics

  union all
  select 14, 'Completed payments', metrics.completed_payments = 19925000, '19925000', metrics.completed_payments::text from metrics

  union all
  select 15, 'Outstanding invoice balance', metrics.outstanding_balance = 26950000, '26950000', metrics.outstanding_balance::text from metrics

  union all
  select 16, 'Recorded expenses', metrics.recorded_expenses = 19250000, '19250000', metrics.recorded_expenses::text from metrics

  union all
  select 17, 'Net cash flow',
    metrics.completed_payments - metrics.recorded_expenses = 675000,
    '675000',
    (metrics.completed_payments - metrics.recorded_expenses)::text
  from metrics

  union all
  select 18, 'No legacy or malformed room numbers',
    count(*) = 0,
    '0', count(*)::text
  from public.rooms as room cross join portfolio
  where room.property_id = portfolio.property_id
    and room.room_number !~ '^[AB](0[1-9]|1[0-2])$'

  union all
  select 19, 'No invalid location/floor combinations',
    count(*) = 0,
    '0', count(*)::text
  from public.rooms as room cross join portfolio
  where room.property_id = portfolio.property_id
    and (room.location, room.floor) not in (
      ('North Wing', 1), ('North Wing', 2),
      ('South Wing', 1), ('South Wing', 2)
    )

  union all
  select 20, 'Portfolio room configuration constraint present',
    count(*) = 1,
    '1', count(*)::text
  from pg_catalog.pg_constraint as constraint_record
  join pg_catalog.pg_class as relation on relation.oid = constraint_record.conrelid
  join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relname = 'rooms'
    and constraint_record.conname = 'rooms_portfolio_location_floor_valid'

  union all
  select 21, 'Expected RLS policies present',
    count(*) = 0,
    '0 missing', count(*)::text || ' missing'
  from expected_policies as expected
  where not exists (
    select 1 from pg_catalog.pg_policies as policy
    where policy.schemaname = 'public'
      and policy.tablename = expected.table_name
      and policy.policyname = expected.policy_name
  )

  union all
  select 22, 'No anon/PUBLIC application-table grants',
    count(*) = 0,
    '0', count(*)::text
  from information_schema.role_table_grants as privilege
  join application_tables as expected on expected.table_name = privilege.table_name
  where privilege.table_schema = 'public'
    and privilege.grantee in ('anon', 'PUBLIC')

  union all
  select 23, 'No anon/PUBLIC RLS policies',
    count(*) = 0,
    '0', count(*)::text
  from pg_catalog.pg_policies as policy
  join application_tables as expected on expected.table_name = policy.tablename
  where policy.schemaname = 'public'
    and array_to_string(policy.roles, ',') ~ '(^|,)(anon|public)(,|$)'

  union all
  select 24, 'Auth provisioning stage is recognized',
    (
      (select count(*) from public.profiles) = 0
      and (select count(*) from public.property_members) = 0
    ) or (
      (select count(*) from public.profiles) = 4
      and (select count(*) from public.property_members) = 3
    ),
    'pre-provision profiles=0/members=0 or post-provision profiles=4/members=3',
    format('profiles=%s, property_members=%s', (select count(*) from public.profiles), (select count(*) from public.property_members))
)
select
  case when passed then 'PASS' else 'FAIL' end as result,
  check_name,
  expected,
  actual
from checks
order by sort_order;
