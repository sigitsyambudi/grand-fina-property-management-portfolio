-- Grand Fina Property Management — Portfolio Edition
-- Supabase Cloud Bootstrap
--
-- Target:
-- Fresh Supabase Cloud project only
--
-- Dataset:
-- 100% fictional Emerald Haven Residence portfolio data
--
-- Generated from:
-- Existing validated migrations + public-safe fictional seeds
--
-- IMPORTANT:
-- Do not use against the private Family Edition database.
-- Do not rerun against an already initialized database.
-- Local Auth test users are intentionally excluded.
--
-- Canonical schema history:
-- supabase/migrations/ remains the source of truth. This deployment-only bundle
-- is not a migration source of truth and exists for one-time SQL Editor use
-- while the Supabase CLI link flow is unavailable in the deployment environment.
--
-- Execution:
-- Run once, in full, against a fresh Supabase Cloud project. The transaction
-- intentionally preserves schema, constraint, foreign-key, grant, and RLS errors.

begin;

-- ============================================================================
-- Source: supabase/migrations/20260728000000_create_grand_fina_core_schema.sql
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_not_blank
    check (display_name is null or btrim(display_name) <> ''),
  constraint profiles_role_valid
    check (role in ('owner', 'admin', 'staff'))
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null,
  currency_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_name_not_blank check (btrim(name) <> ''),
  constraint properties_timezone_not_blank check (btrim(timezone) <> ''),
  constraint properties_currency_code_format
    check (currency_code ~ '^[A-Z]{3}$')
);

create table public.property_members (
  property_id uuid not null references public.properties(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  primary key (property_id, profile_id),
  constraint property_members_role_valid
    check (role in ('owner', 'admin', 'staff'))
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  room_number text not null,
  location text not null,
  floor integer,
  monthly_rate bigint not null,
  status text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_property_id_id_unique unique (property_id, id),
  constraint rooms_property_room_number_unique unique (property_id, room_number),
  constraint rooms_property_sort_order_unique unique (property_id, sort_order),
  constraint rooms_room_number_not_blank check (btrim(room_number) <> ''),
  constraint rooms_location_not_blank check (btrim(location) <> ''),
  constraint rooms_floor_positive check (floor is null or floor > 0),
  constraint rooms_monthly_rate_positive check (monthly_rate > 0),
  constraint rooms_sort_order_positive check (sort_order > 0),
  constraint rooms_status_valid
    check (status in ('occupied', 'available', 'maintenance'))
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  full_name text not null,
  preferred_name text,
  phone text,
  email text,
  emergency_contact_name text,
  emergency_contact_phone text,
  occupation text,
  company_or_institution text,
  status text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_property_id_id_unique unique (property_id, id),
  constraint tenants_full_name_not_blank check (btrim(full_name) <> ''),
  constraint tenants_status_valid check (status in ('active', 'former', 'pending'))
);

create table public.leases (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  tenant_id uuid not null,
  room_id uuid not null,
  status text not null,
  start_date date not null,
  end_date date,
  monthly_rent bigint not null,
  billing_day integer not null,
  deposit_amount bigint,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leases_property_id_id_unique unique (property_id, id),
  constraint leases_tenant_property_fk
    foreign key (property_id, tenant_id)
    references public.tenants(property_id, id)
    on delete restrict,
  constraint leases_room_property_fk
    foreign key (property_id, room_id)
    references public.rooms(property_id, id)
    on delete restrict,
  constraint leases_status_valid check (status in ('active', 'upcoming', 'ended')),
  constraint leases_dates_valid check (end_date is null or end_date >= start_date),
  constraint leases_monthly_rent_positive check (monthly_rent > 0),
  constraint leases_billing_day_valid check (billing_day between 1 and 28),
  constraint leases_deposit_amount_nonnegative
    check (deposit_amount is null or deposit_amount >= 0)
);

create unique index leases_one_active_per_room_idx
  on public.leases (room_id)
  where status = 'active';

create unique index leases_one_active_per_tenant_idx
  on public.leases (tenant_id)
  where status = 'active';

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  lease_id uuid not null,
  reference text not null,
  billing_period date not null,
  issue_date date not null,
  due_date date not null,
  amount bigint not null,
  status text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_property_id_id_unique unique (property_id, id),
  constraint invoices_lease_property_fk
    foreign key (property_id, lease_id)
    references public.leases(property_id, id)
    on delete restrict,
  constraint invoices_property_reference_unique unique (property_id, reference),
  constraint invoices_lease_billing_period_unique unique (lease_id, billing_period),
  constraint invoices_reference_not_blank check (btrim(reference) <> ''),
  constraint invoices_billing_period_month_start
    check (billing_period = date_trunc('month', billing_period)::date),
  constraint invoices_dates_valid check (due_date >= issue_date),
  constraint invoices_amount_positive check (amount > 0),
  constraint invoices_status_valid
    check (status in (
      'draft',
      'issued',
      'partially_paid',
      'paid',
      'overdue',
      'void'
    ))
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  invoice_id uuid not null,
  reference text not null,
  amount bigint not null,
  payment_date date not null,
  method text not null,
  status text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_invoice_property_fk
    foreign key (property_id, invoice_id)
    references public.invoices(property_id, id)
    on delete restrict,
  constraint payments_property_reference_unique unique (property_id, reference),
  constraint payments_reference_not_blank check (btrim(reference) <> ''),
  constraint payments_amount_positive check (amount > 0),
  constraint payments_method_valid
    check (method in ('bank_transfer', 'cash', 'e_wallet', 'other')),
  constraint payments_status_valid
    check (status in ('completed', 'pending', 'reversed'))
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  room_id uuid,
  reference text not null,
  expense_date date not null,
  category text not null,
  description text not null,
  amount bigint not null,
  payment_method text,
  vendor text,
  status text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_room_property_fk
    foreign key (property_id, room_id)
    references public.rooms(property_id, id)
    on delete restrict,
  constraint expenses_property_reference_unique unique (property_id, reference),
  constraint expenses_reference_not_blank check (btrim(reference) <> ''),
  constraint expenses_category_not_blank check (btrim(category) <> ''),
  constraint expenses_description_not_blank check (btrim(description) <> ''),
  constraint expenses_amount_positive check (amount > 0),
  constraint expenses_status_valid check (status in ('recorded', 'pending', 'void'))
);

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  room_id uuid,
  reference text not null,
  reported_date date not null,
  category text not null,
  title text not null,
  description text not null,
  priority text not null,
  status text not null,
  vendor text,
  scheduled_date date,
  completed_date date,
  estimated_cost bigint,
  actual_cost bigint,
  resolution text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_records_room_property_fk
    foreign key (property_id, room_id)
    references public.rooms(property_id, id)
    on delete restrict,
  constraint maintenance_records_property_reference_unique
    unique (property_id, reference),
  constraint maintenance_records_reference_not_blank check (btrim(reference) <> ''),
  constraint maintenance_records_category_not_blank check (btrim(category) <> ''),
  constraint maintenance_records_title_not_blank check (btrim(title) <> ''),
  constraint maintenance_records_description_not_blank
    check (btrim(description) <> ''),
  constraint maintenance_records_priority_valid
    check (priority in ('low', 'medium', 'high', 'urgent')),
  constraint maintenance_records_status_valid
    check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  constraint maintenance_records_schedule_valid
    check (scheduled_date is null or scheduled_date >= reported_date),
  constraint maintenance_records_completion_valid
    check (completed_date is null or completed_date >= reported_date),
  constraint maintenance_records_estimated_cost_nonnegative
    check (estimated_cost is null or estimated_cost >= 0),
  constraint maintenance_records_actual_cost_nonnegative
    check (actual_cost is null or actual_cost >= 0)
);

create index property_members_profile_id_idx
  on public.property_members (profile_id);

create index rooms_property_id_idx on public.rooms (property_id);
create index rooms_status_idx on public.rooms (status);

create index tenants_property_id_idx on public.tenants (property_id);
create index tenants_status_idx on public.tenants (status);

create index leases_property_id_idx on public.leases (property_id);
create index leases_room_id_idx on public.leases (room_id);
create index leases_tenant_id_idx on public.leases (tenant_id);
create index leases_status_idx on public.leases (status);

create index invoices_property_id_idx on public.invoices (property_id);
create index invoices_lease_id_idx on public.invoices (lease_id);
create index invoices_status_idx on public.invoices (status);
create index invoices_billing_period_idx on public.invoices (billing_period);

create index payments_property_id_idx on public.payments (property_id);
create index payments_invoice_id_idx on public.payments (invoice_id);
create index payments_payment_date_idx on public.payments (payment_date);

create index expenses_property_id_idx on public.expenses (property_id);
create index expenses_expense_date_idx on public.expenses (expense_date);
create index expenses_status_idx on public.expenses (status);

create index maintenance_records_property_id_idx
  on public.maintenance_records (property_id);
create index maintenance_records_room_id_idx
  on public.maintenance_records (room_id);
create index maintenance_records_status_idx
  on public.maintenance_records (status);
create index maintenance_records_priority_idx
  on public.maintenance_records (priority);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger properties_set_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

create trigger rooms_set_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

create trigger tenants_set_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

create trigger leases_set_updated_at
before update on public.leases
for each row execute function public.set_updated_at();

create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

create trigger maintenance_records_set_updated_at
before update on public.maintenance_records
for each row execute function public.set_updated_at();

create function public.is_property_member(target_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.property_members
    where property_id = target_property_id
      and profile_id = (select auth.uid())
  );
$$;

revoke all on function public.is_property_member(uuid) from public;
grant execute on function public.is_property_member(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_members enable row level security;
alter table public.rooms enable row level security;
alter table public.tenants enable row level security;
alter table public.leases enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.maintenance_records enable row level security;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy "Members can read their properties"
on public.properties
for select
to authenticated
using (public.is_property_member(id));

create policy "Users can read their own property memberships"
on public.property_members
for select
to authenticated
using (profile_id = (select auth.uid()));

create policy "Members can read property rooms"
on public.rooms
for select
to authenticated
using (public.is_property_member(property_id));

create policy "Members can read property tenants"
on public.tenants
for select
to authenticated
using (public.is_property_member(property_id));

create policy "Members can read property leases"
on public.leases
for select
to authenticated
using (public.is_property_member(property_id));

create policy "Members can read property invoices"
on public.invoices
for select
to authenticated
using (public.is_property_member(property_id));

create policy "Members can read property payments"
on public.payments
for select
to authenticated
using (public.is_property_member(property_id));

create policy "Members can read property expenses"
on public.expenses
for select
to authenticated
using (public.is_property_member(property_id));

create policy "Members can read property maintenance"
on public.maintenance_records
for select
to authenticated
using (public.is_property_member(property_id));

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.properties from anon, authenticated;
revoke all on table public.property_members from anon, authenticated;
revoke all on table public.rooms from anon, authenticated;
revoke all on table public.tenants from anon, authenticated;
revoke all on table public.leases from anon, authenticated;
revoke all on table public.invoices from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.expenses from anon, authenticated;
revoke all on table public.maintenance_records from anon, authenticated;

grant select on table public.profiles to authenticated;
grant select on table public.properties to authenticated;
grant select on table public.property_members to authenticated;
grant select on table public.rooms to authenticated;
grant select on table public.tenants to authenticated;
grant select on table public.leases to authenticated;
grant select on table public.invoices to authenticated;
grant select on table public.payments to authenticated;
grant select on table public.expenses to authenticated;
grant select on table public.maintenance_records to authenticated;

-- ============================================================================
-- Source: supabase/migrations/20260729000000_add_room_configuration_updates.sql
-- ============================================================================

alter table public.rooms
  add constraint rooms_monthly_rate_sensible
    check (monthly_rate <= 1000000000),
  add constraint rooms_location_floor_valid
    check (
      location in ('North Wing', 'South Wing')
      and floor in (1, 2)
    );

create function public.can_manage_property(target_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.property_members
    join public.profiles
      on profiles.id = property_members.profile_id
      and profiles.role = property_members.role
    where property_members.property_id = target_property_id
      and property_members.profile_id = (select auth.uid())
      and property_members.role in ('owner', 'admin')
  );
$$;

revoke all on function public.can_manage_property(uuid) from public;
grant execute on function public.can_manage_property(uuid) to authenticated;

create policy "Owners and admins can update room configuration"
on public.rooms
for update
to authenticated
using (public.can_manage_property(property_id))
with check (public.can_manage_property(property_id));

grant update (monthly_rate, location, floor)
on table public.rooms
to authenticated;

-- ============================================================================
-- Source: supabase/migrations/20260729010000_add_tenant_management_writes.sql
-- ============================================================================

alter table public.tenants
  add constraint tenants_full_name_length
    check (char_length(btrim(full_name)) between 1 and 120),
  add constraint tenants_preferred_name_valid
    check (
      preferred_name is null
      or (
        btrim(preferred_name) <> ''
        and char_length(btrim(preferred_name)) <= 80
      )
    ),
  add constraint tenants_phone_valid
    check (
      phone is null
      or (
        btrim(phone) <> ''
        and char_length(btrim(phone)) <= 40
        and phone ~ '^[0-9+().[:space:]-]+$'
      )
    ),
  add constraint tenants_email_valid
    check (
      email is null
      or (
        char_length(email) <= 254
        and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      )
    ),
  add constraint tenants_occupation_length
    check (occupation is null or char_length(occupation) <= 120),
  add constraint tenants_company_length
    check (
      company_or_institution is null
      or char_length(company_or_institution) <= 160
    ),
  add constraint tenants_emergency_contact_valid
    check (
      (
        emergency_contact_name is null
        and emergency_contact_phone is null
      )
      or (
        emergency_contact_name is not null
        and btrim(emergency_contact_name) <> ''
        and char_length(emergency_contact_name) <= 120
        and emergency_contact_phone is not null
        and btrim(emergency_contact_phone) <> ''
        and char_length(emergency_contact_phone) <= 40
        and emergency_contact_phone ~ '^[0-9+().[:space:]-]+$'
      )
    ),
  add constraint tenants_notes_length
    check (notes is null or char_length(notes) <= 1000);

create policy "Owners and admins can create pending tenants"
on public.tenants
for insert
to authenticated
with check (
  public.can_manage_property(property_id)
  and status = 'pending'
);

create policy "Owners and admins can update tenant profiles"
on public.tenants
for update
to authenticated
using (public.can_manage_property(property_id))
with check (public.can_manage_property(property_id));

grant insert (
  property_id,
  full_name,
  preferred_name,
  phone,
  email,
  emergency_contact_name,
  emergency_contact_phone,
  occupation,
  company_or_institution,
  status,
  notes
)
on table public.tenants
to authenticated;

grant update (
  full_name,
  preferred_name,
  phone,
  email,
  emergency_contact_name,
  emergency_contact_phone,
  occupation,
  company_or_institution,
  notes
)
on table public.tenants
to authenticated;

-- ============================================================================
-- Source: supabase/migrations/20260729020000_add_lease_management_writes.sql
-- ============================================================================

alter table public.leases
  add constraint leases_end_date_after_start
    check (end_date is null or end_date > start_date),
  add constraint leases_monthly_rent_sensible
    check (monthly_rent <= 1000000000),
  add constraint leases_notes_length
    check (notes is null or char_length(notes) <= 1000);

create function public.enforce_active_lease_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'active' then
    raise exception using
      errcode = 'P1603',
      message = 'This workflow only supports active leases.';
  end if;

  if new.start_date > current_date
     or (new.end_date is not null and new.end_date < current_date) then
    raise exception using
      errcode = 'P1604',
      message = 'Active lease dates must include the current date.';
  end if;

  if tg_op = 'UPDATE' then
    if new.property_id is distinct from old.property_id
       or new.tenant_id is distinct from old.tenant_id
       or new.room_id is distinct from old.room_id
       or new.status is distinct from old.status
       or new.deposit_amount is distinct from old.deposit_amount then
      raise exception using
        errcode = 'P1603',
        message = 'Lease relationships, status, and deposit are immutable.';
    end if;

    return new;
  end if;

  perform 1
  from public.rooms
  where id = new.room_id
    and property_id = new.property_id
    and (
      status = 'available'
      or (
        (select auth.uid()) is null
        and status = 'occupied'
      )
    )
  for update;

  if not found then
    raise exception using
      errcode = 'P1601',
      message = 'The selected room is not available.';
  end if;

  if exists (
    select 1
    from public.leases
    where room_id = new.room_id
      and status = 'active'
  ) then
    raise exception using
      errcode = 'P1601',
      message = 'The selected room already has an active lease.';
  end if;

  perform 1
  from public.tenants
  where id = new.tenant_id
    and property_id = new.property_id
    and (
      status in ('pending', 'former')
      or (
        (select auth.uid()) is null
        and status = 'active'
      )
    )
  for update;

  if not found then
    raise exception using
      errcode = 'P1602',
      message = 'The selected tenant is not eligible for an active lease.';
  end if;

  if exists (
    select 1
    from public.leases
    where tenant_id = new.tenant_id
      and status = 'active'
  ) then
    raise exception using
      errcode = 'P1602',
      message = 'The selected tenant already has an active lease.';
  end if;

  update public.rooms
  set status = 'occupied'
  where id = new.room_id
    and property_id = new.property_id;

  update public.tenants
  set status = 'active'
  where id = new.tenant_id
    and property_id = new.property_id;

  return new;
end;
$$;

revoke all on function public.enforce_active_lease_write() from public;

create trigger leases_enforce_active_write
before insert or update on public.leases
for each row execute function public.enforce_active_lease_write();

create policy "Owners and admins can create active leases"
on public.leases
for insert
to authenticated
with check (
  public.can_manage_property(property_id)
  and status = 'active'
);

create policy "Owners and admins can update active lease terms"
on public.leases
for update
to authenticated
using (
  public.can_manage_property(property_id)
  and status = 'active'
)
with check (
  public.can_manage_property(property_id)
  and status = 'active'
);

grant insert (
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
on table public.leases
to authenticated;

grant update (
  start_date,
  end_date,
  monthly_rent,
  billing_day,
  notes
)
on table public.leases
to authenticated;

-- ============================================================================
-- Source: supabase/migrations/20260729030000_add_invoice_billing_writes.sql
-- ============================================================================

alter table public.invoices
  add constraint invoices_amount_sensible
    check (amount <= 1000000000),
  add constraint invoices_notes_length
    check (notes is null or char_length(notes) <= 1000),
  add constraint invoices_due_date_in_billing_period
    check (date_trunc('month', due_date)::date = billing_period);

create sequence public.invoice_reference_sequence
  as bigint
  start with 1000;

revoke all on sequence public.invoice_reference_sequence from public;

create function public.derive_invoice_status(
  target_amount bigint,
  target_due_date date,
  target_paid_amount bigint
)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when target_paid_amount >= target_amount then 'paid'
    when target_due_date < current_date then 'overdue'
    when target_paid_amount > 0 then 'partially_paid'
    else 'issued'
  end;
$$;

revoke all on function public.derive_invoice_status(bigint, date, bigint)
from public;

create function public.enforce_invoice_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  lease_start_date date;
  lease_end_date date;
  paid_amount bigint;
begin
  select start_date, end_date
  into lease_start_date, lease_end_date
  from public.leases
  where id = new.lease_id
    and property_id = new.property_id;

  if not found then
    raise exception using
      errcode = 'P1701',
      message = 'The selected lease is not available for this property.';
  end if;

  if new.billing_period < date_trunc('month', lease_start_date)::date
     or (
       lease_end_date is not null
       and new.billing_period > date_trunc('month', lease_end_date)::date
     ) then
    raise exception using
      errcode = 'P1702',
      message = 'The selected lease is not billable for this period.';
  end if;

  if tg_op = 'UPDATE' then
    if new.property_id is distinct from old.property_id
       or new.lease_id is distinct from old.lease_id
       or new.billing_period is distinct from old.billing_period
       or new.reference is distinct from old.reference then
      raise exception using
        errcode = 'P1703',
        message = 'Invoice relationship, period, and reference are immutable.';
    end if;

    if new.amount is distinct from old.amount
       and exists (
         select 1
         from public.payments
         where invoice_id = old.id
       ) then
      raise exception using
        errcode = 'P1704',
        message = 'Invoice amount is immutable after a payment exists.';
    end if;
  elsif new.reference is null or btrim(new.reference) = '' then
    new.reference :=
      'GF-INV-' ||
      to_char(new.billing_period, 'YYYYMM') ||
      '-' ||
      lpad(
        nextval('public.invoice_reference_sequence'::regclass)::text,
        6,
        '0'
      );
  end if;

  select coalesce(sum(amount), 0)
  into paid_amount
  from public.payments
  where invoice_id = new.id
    and status = 'completed';

  if paid_amount > new.amount then
    raise exception using
      errcode = 'P1705',
      message = 'Invoice amount cannot be lower than completed payments.';
  end if;

  if (select auth.uid()) is not null or new.status is null then
    new.status := public.derive_invoice_status(
      new.amount,
      new.due_date,
      paid_amount
    );
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_invoice_write() from public;

create trigger invoices_enforce_write
before insert or update on public.invoices
for each row execute function public.enforce_invoice_write();

create function public.refresh_invoice_status(target_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_invoice public.invoices%rowtype;
  paid_amount bigint;
begin
  select *
  into target_invoice
  from public.invoices
  where id = target_invoice_id
  for update;

  if not found then
    return;
  end if;

  select coalesce(sum(amount), 0)
  into paid_amount
  from public.payments
  where invoice_id = target_invoice_id
    and status = 'completed';

  if paid_amount > target_invoice.amount then
    raise exception using
      errcode = 'P1705',
      message = 'Completed payments cannot exceed the invoice amount.';
  end if;

  update public.invoices
  set status = public.derive_invoice_status(
    target_invoice.amount,
    target_invoice.due_date,
    paid_amount
  )
  where id = target_invoice_id;
end;
$$;

revoke all on function public.refresh_invoice_status(uuid) from public;

create function public.synchronize_invoice_after_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_invoice_status(old.invoice_id);
    return old;
  end if;

  perform public.refresh_invoice_status(new.invoice_id);

  if tg_op = 'UPDATE' and old.invoice_id is distinct from new.invoice_id then
    perform public.refresh_invoice_status(old.invoice_id);
  end if;

  return new;
end;
$$;

revoke all on function public.synchronize_invoice_after_payment() from public;

create trigger payments_synchronize_invoice_status
after insert or update or delete on public.payments
for each row execute function public.synchronize_invoice_after_payment();

create policy "Owners and admins can create invoices"
on public.invoices
for insert
to authenticated
with check (public.can_manage_property(property_id));

create policy "Owners and admins can update safe invoice fields"
on public.invoices
for update
to authenticated
using (public.can_manage_property(property_id))
with check (public.can_manage_property(property_id));

grant insert (
  property_id,
  lease_id,
  billing_period,
  issue_date,
  due_date,
  amount,
  notes
)
on table public.invoices
to authenticated;

grant update (
  issue_date,
  due_date,
  amount,
  notes
)
on table public.invoices
to authenticated;

-- ============================================================================
-- Source: supabase/migrations/20260729040000_add_payment_management_writes.sql
-- ============================================================================

alter table public.payments
  add constraint payments_amount_sensible
    check (amount <= 1000000000),
  add constraint payments_notes_length
    check (notes is null or char_length(notes) <= 1000);

create sequence public.payment_reference_sequence
  as bigint
  start with 1000;

revoke all on sequence public.payment_reference_sequence from public;

create function public.enforce_payment_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invoice_amount bigint;
  completed_amount bigint;
begin
  select amount
  into invoice_amount
  from public.invoices
  where id = new.invoice_id
    and property_id = new.property_id
  for update;

  if not found then
    raise exception using
      errcode = 'P1801',
      message = 'The selected invoice is not available for this property.';
  end if;

  if tg_op = 'UPDATE' then
    if new.property_id is distinct from old.property_id
       or new.invoice_id is distinct from old.invoice_id
       or new.reference is distinct from old.reference
       or new.amount is distinct from old.amount
       or new.payment_date is distinct from old.payment_date
       or new.method is distinct from old.method
       or new.status is distinct from old.status then
      raise exception using
        errcode = 'P1802',
        message = 'Payment financial fields are immutable.';
    end if;
  elsif (select auth.uid()) is not null then
    new.reference :=
      'GF-PAY-' ||
      to_char(new.payment_date, 'YYYYMM') ||
      '-' ||
      lpad(
        nextval('public.payment_reference_sequence'::regclass)::text,
        6,
        '0'
      );
    new.status := 'completed';
  elsif new.reference is null or btrim(new.reference) = '' then
    new.reference :=
      'GF-PAY-' ||
      to_char(new.payment_date, 'YYYYMM') ||
      '-' ||
      lpad(
        nextval('public.payment_reference_sequence'::regclass)::text,
        6,
        '0'
      );
  end if;

  if new.status = 'completed' then
    select coalesce(sum(amount), 0)
    into completed_amount
    from public.payments
    where invoice_id = new.invoice_id
      and status = 'completed'
      and id is distinct from new.id;

    if completed_amount + new.amount > invoice_amount then
      raise exception using
        errcode = 'P1803',
        message = 'Payment amount exceeds the remaining invoice balance.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_payment_write() from public;

create trigger payments_enforce_write
before insert or update on public.payments
for each row execute function public.enforce_payment_write();

create policy "Owners and admins can create payments"
on public.payments
for insert
to authenticated
with check (public.can_manage_property(property_id));

create policy "Owners and admins can update payment notes"
on public.payments
for update
to authenticated
using (public.can_manage_property(property_id))
with check (public.can_manage_property(property_id));

grant insert (
  property_id,
  invoice_id,
  amount,
  payment_date,
  method,
  notes
)
on table public.payments
to authenticated;

grant update (notes)
on table public.payments
to authenticated;

-- ============================================================================
-- Source: supabase/migrations/20260730000000_add_expense_management_writes.sql
-- ============================================================================

alter table public.expenses
  add column void_reason text,
  add column voided_at timestamptz,
  add column voided_by uuid references public.profiles(id) on delete set null,
  alter column payment_method set not null,
  add constraint expenses_category_valid
    check (
      category in (
        'utilities',
        'maintenance',
        'internet',
        'cleaning',
        'supplies',
        'payroll',
        'security',
        'taxes_fees',
        'other'
      )
    ),
  add constraint expenses_payment_method_valid
    check (payment_method in ('bank_transfer', 'cash', 'e_wallet', 'other')),
  add constraint expenses_amount_sensible
    check (amount <= 1000000000),
  add constraint expenses_description_length
    check (char_length(btrim(description)) between 1 and 240),
  add constraint expenses_vendor_length
    check (
      vendor is null
      or (
        btrim(vendor) <> ''
        and char_length(btrim(vendor)) <= 160
      )
    ),
  add constraint expenses_notes_length
    check (notes is null or char_length(notes) <= 1000),
  add constraint expenses_void_reason_length
    check (
      void_reason is null
      or char_length(btrim(void_reason)) between 1 and 500
    );

update public.expenses
set
  void_reason = coalesce(
    void_reason,
    'Legacy demo record was already void before the audited write workflow.'
  ),
  voided_at = coalesce(voided_at, updated_at)
where status = 'void';

alter table public.expenses
  add constraint expenses_void_metadata_consistent
    check (
      (
        status = 'void'
        and void_reason is not null
        and btrim(void_reason) <> ''
        and voided_at is not null
      )
      or (
        status <> 'void'
        and void_reason is null
        and voided_at is null
        and voided_by is null
      )
    );

create sequence public.expense_reference_sequence
  as bigint
  start with 1000;

revoke all on sequence public.expense_reference_sequence from public;

create function public.enforce_expense_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using
      errcode = 'P2004',
      message = 'Expenses cannot be hard-deleted. Void the record instead.';
  end if;

  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null then
      if new.status not in ('pending', 'recorded') then
        raise exception using
          errcode = 'P2002',
          message = 'A new expense must be pending or recorded.';
      end if;

      new.reference :=
        'GF-EXP-' ||
        to_char(new.expense_date, 'YYYYMM') ||
        '-' ||
        lpad(
          nextval('public.expense_reference_sequence'::regclass)::text,
          6,
          '0'
        );
      new.void_reason := null;
      new.voided_at := null;
      new.voided_by := null;
    else
      if new.reference is null or btrim(new.reference) = '' then
        new.reference :=
          'GF-EXP-' ||
          to_char(new.expense_date, 'YYYYMM') ||
          '-' ||
          lpad(
            nextval('public.expense_reference_sequence'::regclass)::text,
            6,
            '0'
          );
      end if;

      if new.status = 'void' then
        new.void_reason := coalesce(
          new.void_reason,
          'Seeded fictional void record retained for interface validation.'
        );
        new.voided_at := coalesce(new.voided_at, now());
      end if;
    end if;

    return new;
  end if;

  if new.property_id is distinct from old.property_id
     or new.reference is distinct from old.reference then
    raise exception using
      errcode = 'P2001',
      message = 'Expense property and reference are immutable.';
  end if;

  if old.status = 'void'
     and new.voided_by is null
     and old.voided_by is not null
     and new.property_id is not distinct from old.property_id
     and new.room_id is not distinct from old.room_id
     and new.reference is not distinct from old.reference
     and new.expense_date is not distinct from old.expense_date
     and new.category is not distinct from old.category
     and new.description is not distinct from old.description
     and new.amount is not distinct from old.amount
     and new.payment_method is not distinct from old.payment_method
     and new.vendor is not distinct from old.vendor
     and new.status is not distinct from old.status
     and new.notes is not distinct from old.notes
     and new.void_reason is not distinct from old.void_reason
     and new.voided_at is not distinct from old.voided_at then
    return new;
  end if;

  if old.status = 'void' then
    raise exception using
      errcode = 'P2004',
      message = 'A void expense is immutable.';
  end if;

  if old.status = 'recorded'
     and (
       new.room_id is distinct from old.room_id
       or new.expense_date is distinct from old.expense_date
       or new.category is distinct from old.category
       or new.description is distinct from old.description
       or new.amount is distinct from old.amount
       or new.payment_method is distinct from old.payment_method
       or new.vendor is distinct from old.vendor
     ) then
    raise exception using
      errcode = 'P2003',
      message = 'Recorded expense financial fields are immutable.';
  end if;

  if old.status = 'recorded' and new.status not in ('recorded', 'void') then
    raise exception using
      errcode = 'P2002',
      message = 'A recorded expense may only remain recorded or be voided.';
  end if;

  if old.status = 'pending' and new.status not in ('pending', 'recorded', 'void') then
    raise exception using
      errcode = 'P2002',
      message = 'The expense status transition is invalid.';
  end if;

  if new.status = 'void' then
    if new.void_reason is null or btrim(new.void_reason) = '' then
      raise exception using
        errcode = 'P2002',
        message = 'A void reason is required.';
    end if;

    new.void_reason := btrim(new.void_reason);
    new.voided_at := now();
    new.voided_by := (select auth.uid());
  else
    new.void_reason := null;
    new.voided_at := null;
    new.voided_by := null;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_expense_write() from public;

create trigger expenses_enforce_write
before insert or update or delete on public.expenses
for each row execute function public.enforce_expense_write();

create policy "Owners and admins can create expenses"
on public.expenses
for insert
to authenticated
with check (
  public.can_manage_property(property_id)
  and status in ('pending', 'recorded')
);

create policy "Owners and admins can update expenses"
on public.expenses
for update
to authenticated
using (public.can_manage_property(property_id))
with check (public.can_manage_property(property_id));

grant insert (
  property_id,
  room_id,
  expense_date,
  category,
  description,
  amount,
  payment_method,
  vendor,
  status,
  notes
)
on table public.expenses
to authenticated;

grant update (
  room_id,
  expense_date,
  category,
  description,
  amount,
  payment_method,
  vendor,
  status,
  notes,
  void_reason
)
on table public.expenses
to authenticated;

-- ============================================================================
-- Source: supabase/migrations/20260730010000_add_maintenance_management_writes.sql
-- ============================================================================

alter table public.maintenance_records
  add constraint maintenance_records_category_valid
    check (
      category in (
        'plumbing',
        'electrical',
        'ac',
        'furniture',
        'appliance',
        'internet',
        'building',
        'cleaning',
        'other'
      )
    ),
  add constraint maintenance_records_title_length
    check (char_length(btrim(title)) between 1 and 160),
  add constraint maintenance_records_description_length
    check (char_length(btrim(description)) between 1 and 2000),
  add constraint maintenance_records_vendor_length
    check (
      vendor is null
      or (
        btrim(vendor) <> ''
        and char_length(btrim(vendor)) <= 160
      )
    ),
  add constraint maintenance_records_resolution_length
    check (
      resolution is null
      or char_length(btrim(resolution)) between 1 and 2000
    ),
  add constraint maintenance_records_notes_length
    check (notes is null or char_length(notes) <= 2000),
  add constraint maintenance_records_estimated_cost_sensible
    check (estimated_cost is null or estimated_cost <= 1000000000),
  add constraint maintenance_records_actual_cost_sensible
    check (actual_cost is null or actual_cost <= 1000000000),
  add constraint maintenance_records_completion_after_schedule
    check (
      completed_date is null
      or scheduled_date is null
      or completed_date >= scheduled_date
    ),
  add constraint maintenance_records_completion_state_consistent
    check (
      (
        status = 'completed'
        and completed_date is not null
      )
      or (
        status <> 'completed'
        and completed_date is null
        and actual_cost is null
        and resolution is null
      )
    ),
  add constraint maintenance_records_cancellation_note_required
    check (
      status <> 'cancelled'
      or (
        notes is not null
        and btrim(notes) <> ''
      )
    );

create sequence public.maintenance_reference_sequence
  as bigint
  start with 1000;

revoke all on sequence public.maintenance_reference_sequence from public;

create function public.enforce_maintenance_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using
      errcode = 'P2104',
      message = 'Maintenance records cannot be hard-deleted. Cancel the record instead.';
  end if;

  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null then
      if new.status <> 'open' then
        raise exception using
          errcode = 'P2102',
          message = 'A new maintenance record must be open.';
      end if;

      new.reference :=
        'GF-MNT-' ||
        to_char(new.reported_date, 'YYYYMM') ||
        '-' ||
        lpad(
          nextval('public.maintenance_reference_sequence'::regclass)::text,
          6,
          '0'
        );
      new.completed_date := null;
      new.actual_cost := null;
      new.resolution := null;
    elsif new.reference is null or btrim(new.reference) = '' then
      new.reference :=
        'GF-MNT-' ||
        to_char(new.reported_date, 'YYYYMM') ||
        '-' ||
        lpad(
          nextval('public.maintenance_reference_sequence'::regclass)::text,
          6,
          '0'
        );
    end if;

    return new;
  end if;

  if new.property_id is distinct from old.property_id
     or new.reference is distinct from old.reference then
    raise exception using
      errcode = 'P2101',
      message = 'Maintenance property and reference are immutable.';
  end if;

  if old.status in ('completed', 'cancelled') then
    raise exception using
      errcode = 'P2104',
      message = 'A completed or cancelled maintenance record is immutable.';
  end if;

  if old.status = 'open'
     and new.status not in ('open', 'in_progress', 'completed', 'cancelled') then
    raise exception using
      errcode = 'P2102',
      message = 'The maintenance status transition is invalid.';
  end if;

  if old.status = 'in_progress'
     and new.status not in ('in_progress', 'completed', 'cancelled') then
    raise exception using
      errcode = 'P2102',
      message = 'The maintenance status transition is invalid.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_maintenance_write() from public;

create trigger maintenance_records_enforce_write
before insert or update or delete on public.maintenance_records
for each row execute function public.enforce_maintenance_write();

create policy "Owners and admins can create maintenance"
on public.maintenance_records
for insert
to authenticated
with check (
  public.can_manage_property(property_id)
  and status = 'open'
);

create policy "Owners and admins can update maintenance"
on public.maintenance_records
for update
to authenticated
using (public.can_manage_property(property_id))
with check (public.can_manage_property(property_id));

grant insert (
  property_id,
  room_id,
  reported_date,
  category,
  title,
  description,
  priority,
  status,
  vendor,
  scheduled_date,
  estimated_cost,
  notes
)
on table public.maintenance_records
to authenticated;

grant update (
  room_id,
  reported_date,
  category,
  title,
  description,
  priority,
  status,
  vendor,
  scheduled_date,
  completed_date,
  estimated_cost,
  actual_cost,
  resolution,
  notes
)
on table public.maintenance_records
to authenticated;

-- ============================================================================
-- Source: supabase/migrations/20260806000000_enforce_portfolio_room_configuration.sql
-- ============================================================================

alter table public.rooms
  add constraint rooms_portfolio_location_floor_valid
    check (
      room_number !~ '^[AB](0[1-9]|1[0-2])$'
      or (room_number ~ '^A0[1-6]$' and location = 'North Wing' and floor = 1)
      or (room_number ~ '^A(0[7-9]|1[0-2])$' and location = 'North Wing' and floor = 2)
      or (room_number ~ '^B0[1-6]$' and location = 'South Wing' and floor = 1)
      or (room_number ~ '^B(0[7-9]|1[0-2])$' and location = 'South Wing' and floor = 2)
    );

-- ============================================================================
-- Source: supabase/seed.sql
-- ============================================================================

-- Public portfolio canonical data. All names, configuration, and financial
-- values in this file are fictional and intended only for demonstration.
insert into public.properties (id, name, timezone, currency_code)
values (
  '00000000-0000-4000-8000-000000000001',
  'Emerald Haven Residence',
  'Asia/Jayapura',
  'IDR'
)
on conflict (id) do update
set name = excluded.name,
    timezone = excluded.timezone,
    currency_code = excluded.currency_code;

insert into public.rooms (
  id, property_id, room_number, location, floor, monthly_rate, status, sort_order
)
values
  ('00000000-0000-4000-8100-000000000001', '00000000-0000-4000-8000-000000000001', 'A01', 'North Wing', 1, 2100000, 'occupied',     1),
  ('00000000-0000-4000-8100-000000000002', '00000000-0000-4000-8000-000000000001', 'A02', 'North Wing', 1, 2150000, 'occupied',     2),
  ('00000000-0000-4000-8100-000000000003', '00000000-0000-4000-8000-000000000001', 'A03', 'North Wing', 1, 2200000, 'occupied',     3),
  ('00000000-0000-4000-8100-000000000004', '00000000-0000-4000-8000-000000000001', 'A04', 'North Wing', 1, 2250000, 'occupied',     4),
  ('00000000-0000-4000-8100-000000000005', '00000000-0000-4000-8000-000000000001', 'A05', 'North Wing', 1, 2300000, 'occupied',     5),
  ('00000000-0000-4000-8100-000000000006', '00000000-0000-4000-8000-000000000001', 'A06', 'North Wing', 1, 2350000, 'occupied',     6),
  ('00000000-0000-4000-8100-000000000007', '00000000-0000-4000-8000-000000000001', 'A07', 'North Wing', 2, 2400000, 'occupied',     7),
  ('00000000-0000-4000-8100-000000000008', '00000000-0000-4000-8000-000000000001', 'A08', 'North Wing', 2, 2450000, 'occupied',     8),
  ('00000000-0000-4000-8100-000000000009', '00000000-0000-4000-8000-000000000001', 'A09', 'North Wing', 2, 2500000, 'occupied',     9),
  ('00000000-0000-4000-8100-000000000010', '00000000-0000-4000-8000-000000000001', 'A10', 'North Wing', 2, 2550000, 'available',   10),
  ('00000000-0000-4000-8100-000000000011', '00000000-0000-4000-8000-000000000001', 'A11', 'North Wing', 2, 2600000, 'occupied',    11),
  ('00000000-0000-4000-8100-000000000012', '00000000-0000-4000-8000-000000000001', 'A12', 'North Wing', 2, 2650000, 'occupied',    12),
  ('00000000-0000-4000-8100-000000000013', '00000000-0000-4000-8000-000000000001', 'B01', 'South Wing', 1, 2125000, 'occupied',   13),
  ('00000000-0000-4000-8100-000000000014', '00000000-0000-4000-8000-000000000001', 'B02', 'South Wing', 1, 2175000, 'occupied',   14),
  ('00000000-0000-4000-8100-000000000015', '00000000-0000-4000-8000-000000000001', 'B03', 'South Wing', 1, 2225000, 'occupied',   15),
  ('00000000-0000-4000-8100-000000000016', '00000000-0000-4000-8000-000000000001', 'B04', 'South Wing', 1, 2275000, 'occupied',   16),
  ('00000000-0000-4000-8100-000000000017', '00000000-0000-4000-8000-000000000001', 'B05', 'South Wing', 1, 2325000, 'occupied',   17),
  ('00000000-0000-4000-8100-000000000018', '00000000-0000-4000-8000-000000000001', 'B06', 'South Wing', 1, 2375000, 'occupied',   18),
  ('00000000-0000-4000-8100-000000000019', '00000000-0000-4000-8000-000000000001', 'B07', 'South Wing', 2, 2425000, 'occupied',   19),
  ('00000000-0000-4000-8100-000000000020', '00000000-0000-4000-8000-000000000001', 'B08', 'South Wing', 2, 2475000, 'occupied',   20),
  ('00000000-0000-4000-8100-000000000021', '00000000-0000-4000-8000-000000000001', 'B09', 'South Wing', 2, 2525000, 'occupied',   21),
  ('00000000-0000-4000-8100-000000000022', '00000000-0000-4000-8000-000000000001', 'B10', 'South Wing', 2, 2575000, 'available',  22),
  ('00000000-0000-4000-8100-000000000023', '00000000-0000-4000-8000-000000000001', 'B11', 'South Wing', 2, 2625000, 'available',  23),
  ('00000000-0000-4000-8100-000000000024', '00000000-0000-4000-8000-000000000001', 'B12', 'South Wing', 2, 2675000, 'maintenance', 24)
on conflict (id) do update
set property_id = excluded.property_id,
    room_number = excluded.room_number,
    location = excluded.location,
    floor = excluded.floor,
    monthly_rate = excluded.monthly_rate,
    status = excluded.status,
    sort_order = excluded.sort_order;

-- ============================================================================
-- Source: supabase/seed-demo.sql
-- ============================================================================

-- Fictional local-only operational records for authenticated read-layer validation.
-- Property identity, room configuration, rates, and occupancy are defined in the
-- public-safe seed.sql. Every identity and activity record below is fictional.

with tenant_seed (
  sequence,
  full_name,
  preferred_name,
  occupation,
  company_or_institution,
  notes
) as (
  values
    (1,  'Arga Pranata',       'Arga',   'Graphic designer',         'Demo Organization 01', 'Prefers concise operational notices by text message.'),
    (2,  'Citra Maheswari',    'Citra',  'Accountant',               'Demo Organization 02', 'Standard contact preference recorded for this fictional profile.'),
    (3,  'Dimas Kurniawan',    'Dimas',  'Teacher',                  'Demo Institution 03',  'No additional operational notes.'),
    (4,  'Nabila Larasati',    'Nabila', 'Research assistant',       'Demo Institution 04',  'Prefers notices during standard daytime hours.'),
    (5,  'Reza Adinata',       'Reza',   'Sales coordinator',        'Demo Organization 05', 'No additional operational notes.'),
    (6,  'Sari Wulandari',     'Sari',   'Nurse',                    'Demo Institution 06',  'Shift-work contact preference noted for this fictional profile.'),
    (7,  'Fajar Nugroho',      'Fajar',  'Site supervisor',          'Demo Organization 07', 'Prefers advance notice for routine room access.'),
    (8,  'Maya Anggraini',     'Maya',   'Administrative officer',   'Demo Organization 08', 'No additional operational notes.'),
    (9,  'Bima Santoso',       'Bima',   'Technician',               'Demo Organization 09', 'Standard contact preference recorded for this fictional profile.'),
    (10, 'Lestari Puspita',    'Tari',   'Customer service officer', 'Demo Organization 10', 'Prefers concise operational notices by text message.'),
    (11, 'Raka Permana',       'Raka',   'Civil engineer',           'Demo Organization 11', 'No additional operational notes.'),
    (12, 'Intan Safitri',      'Intan',  'Pharmacy assistant',       'Demo Institution 12',  'Prefers notices during standard daytime hours.'),
    (13, 'Galih Ramadhan',     'Galih',  'Procurement officer',      'Demo Organization 13', 'Standard contact preference recorded for this fictional profile.'),
    (14, 'Putri Anindya',      'Putri',  'Laboratory assistant',     'Demo Institution 14',  'No additional operational notes.'),
    (15, 'Yoga Prakoso',       'Yoga',   'Logistics coordinator',    'Demo Organization 15', 'Prefers advance notice for routine room access.'),
    (16, 'Amel Kartika',       'Amel',   'Project administrator',    'Demo Organization 16', 'Standard contact preference recorded for this fictional profile.'),
    (17, 'Bayu Firmansyah',    'Bayu',   'Field coordinator',        'Demo Organization 17', 'No additional operational notes.'),
    (18, 'Dewi Kencana',       'Dewi',   'Office manager',           'Demo Organization 18', 'Prefers concise operational notices by text message.'),
    (19, 'Kirana Ayuningtyas', 'Kirana', 'Communications officer',   'Demo Organization 19', 'No additional operational notes.'),
    (20, 'Naufal Hidayat',     'Naufal', 'Software tester',          'Demo Organization 20', 'Standard contact preference recorded for this fictional profile.')
)
insert into public.tenants (
  id,
  property_id,
  full_name,
  preferred_name,
  phone,
  email,
  emergency_contact_name,
  emergency_contact_phone,
  occupation,
  company_or_institution,
  status,
  notes
)
select
  md5('tenant-demo-' || lpad(sequence::text, 3, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001',
  full_name,
  preferred_name,
  '+62 000 1000 ' || lpad(sequence::text, 2, '0'),
  case
    when sequence % 3 = 0 then null
    else 'tenant.' || lpad(sequence::text, 2, '0') || '@example.com'
  end,
  'Fictional Contact ' || lpad(sequence::text, 2, '0'),
  '+62 000 9000 ' || lpad(sequence::text, 2, '0'),
  occupation,
  company_or_institution,
  'active',
  notes
from tenant_seed;

with occupied_rooms as (
  select
    id,
    monthly_rate,
    row_number() over (order by sort_order)::integer as sequence
  from public.rooms
  where property_id = '00000000-0000-4000-8000-000000000001'
    and status = 'occupied'
)
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
  deposit_amount,
  notes
)
select
  md5('lease-demo-' || lpad(sequence::text, 3, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001',
  md5('tenant-demo-' || lpad(sequence::text, 3, '0'))::uuid,
  id,
  'active',
  (date '2024-06-01' + ((sequence - 1) || ' months')::interval)::date,
  make_date(2027, ((sequence - 1) % 12) + 1, 28),
  monthly_rate,
  (array[1, 5, 10])[((sequence - 1) % 3) + 1],
  null,
  'Fictional lease timing for interface validation. Operational terms require owner confirmation before persistence.'
from occupied_rooms;

with active_leases as (
  select
    id,
    monthly_rent,
    billing_day,
    row_number() over (order by start_date, id)::integer as sequence
  from public.leases
  where property_id = '00000000-0000-4000-8000-000000000001'
    and status = 'active'
)
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
select
  md5('invoice-demo-202607-' || lpad(sequence::text, 3, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001',
  id,
  'EH-INV-202607-' || lpad(sequence::text, 3, '0'),
  date '2026-07-01',
  date '2026-06-25',
  make_date(2026, 7, billing_day),
  monthly_rent,
  'issued',
  'Fictional July 2026 rent invoice for interface validation. Payment records do not represent actual collections.'
from active_leases;

with active_leases as (
  select
    id,
    monthly_rent,
    billing_day,
    row_number() over (order by start_date, id)::integer as sequence
  from public.leases
  where property_id = '00000000-0000-4000-8000-000000000001'
    and status = 'active'
),
payment_amounts as (
  select
    sequence,
    case
      when billing_day = 10 and (sequence - 1) % 2 = 1
        then floor(monthly_rent / 2.0)::bigint
      when billing_day <> 10 and (sequence - 1) % 2 = 0
        then monthly_rent
      else null
    end as amount
  from active_leases
),
payment_parts as (
  select sequence, 1 as part, amount
  from payment_amounts
  where amount is not null and sequence <> 6
  union all
  select sequence, part, floor(amount / 2.0)::bigint
  from payment_amounts
  cross join (values (1), (2)) as parts(part)
  where sequence = 6
),
numbered_payments as (
  select
    sequence as lease_sequence,
    part,
    amount,
    row_number() over (order by sequence, part)::integer as payment_sequence
  from payment_parts
)
insert into public.payments (
  id,
  property_id,
  invoice_id,
  reference,
  amount,
  payment_date,
  method,
  status,
  notes
)
select
  md5('payment-demo-202607-' || lpad(payment_sequence::text, 3, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001',
  md5('invoice-demo-202607-' || lpad(lease_sequence::text, 3, '0'))::uuid,
  'EH-PAY-DEMO-202607-' || lpad(payment_sequence::text, 3, '0'),
  amount,
  make_date(2026, 7, ((payment_sequence - 1) % 5) + 1),
  (array['bank_transfer', 'cash', 'e_wallet', 'other'])[
    ((payment_sequence - 1) % 4) + 1
  ],
  'completed',
  case
    when part > 1 then
      'Fictional split payment part ' || part || ' for interface validation.'
    else 'Fictional completed payment for interface validation.'
  end
from numbered_payments;

update public.invoices as invoice
set status = case
  when payment.total_paid = invoice.amount then 'paid'
  when invoice.due_date < date '2026-07-06' and invoice.amount > coalesce(payment.total_paid, 0)
    then 'overdue'
  when coalesce(payment.total_paid, 0) > 0 then 'partially_paid'
  else 'issued'
end
from (
  select invoice_id, sum(amount) as total_paid
  from public.payments
  where status = 'completed'
  group by invoice_id
) as payment
where invoice.id = payment.invoice_id;

update public.invoices
set status = 'overdue'
where due_date < date '2026-07-06'
  and id not in (select invoice_id from public.payments);

with expense_seed (
  sequence, expense_date, category, description, amount, payment_method,
  vendor, room_number, status, notes
) as (
  values
    (1,  date '2026-07-02', 'utilities',   'Property electricity and water service', 4800000, 'bank_transfer', 'Fictional Utility Vendor',       null,  'recorded', 'Fictional property-wide utility expense for interface validation.'),
    (2,  date '2026-07-04', 'maintenance', 'Demo plumbing repair',                    850000,  'cash',          'Demo Maintenance Provider',     'A04', 'recorded', 'Fictional room-specific maintenance expense.'),
    (3,  date '2026-07-05', 'internet',    'Property internet service',               1250000, 'bank_transfer', 'Fictional Internet Provider',    null,  'recorded', 'Fictional shared internet service expense.'),
    (4,  date '2026-07-07', 'cleaning',    'Common-area cleaning service',            1100000, 'e_wallet',      'Demo Cleaning Service',          null,  'recorded', 'Fictional cleaning expense for shared property areas.'),
    (5,  date '2026-07-08', 'supplies',    'Replacement room supplies',                475000,  'cash',          'Fictional Property Supplies',    'A05', 'recorded', 'Fictional room-specific supplies purchase.'),
    (6,  date '2026-07-10', 'payroll',     'Property support payroll',                6000000, 'bank_transfer', 'Demo Internal Payroll',          null,  'recorded', 'Fictional aggregate payroll expense; no employee identity or banking data is included.'),
    (7,  date '2026-07-12', 'security',    'Property security service',               2400000, 'bank_transfer', 'Fictional Security Provider',     null,  'recorded', 'Fictional property-wide security service expense.'),
    (8,  date '2026-07-14', 'other',       'Administrative service charge',            650000,  'other',         'Demo Administration Vendor',     null,  'pending',  'Fictional pending administrative expense.'),
    (9,  date '2026-07-16', 'utilities',   'Room utility equipment service',           900000,  'bank_transfer', 'Fictional Utility Vendor',        'B09', 'pending',  'Fictional pending room-specific utility expense.'),
    (10, date '2026-07-18', 'maintenance', 'Demo air-conditioning service',           1350000, 'e_wallet',      'Demo Maintenance Provider',      'B03', 'recorded', 'Fictional room-specific maintenance expense.'),
    (11, date '2026-07-20', 'internet',    'Network equipment service',                300000,  'cash',          'Fictional Internet Provider',     null,  'recorded', 'Fictional shared network service expense.'),
    (12, date '2026-07-22', 'cleaning',    'Room deep-cleaning service',               425000,  'cash',          'Demo Cleaning Service',          'A11', 'pending',  'Fictional pending room-specific cleaning expense.'),
    (13, date '2026-07-24', 'supplies',    'Shared cleaning and office supplies',      725000,  'e_wallet',      'Fictional Property Supplies',     null,  'recorded', 'Fictional property-wide supplies expense.'),
    (14, date '2026-07-25', 'taxes_fees',  'Administrative permit fee',               1800000, 'bank_transfer', 'Demo Administrative Office',      null,  'void',     'Fictional void expense retained to demonstrate an auditable correction state.')
)
insert into public.expenses (
  id, property_id, room_id, reference, expense_date, category, description,
  amount, payment_method, vendor, status, notes
)
select
  md5('expense-demo-' || lpad(seed.sequence::text, 3, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001',
  room.id,
  'EH-EXP-DEMO-202607-' || lpad(seed.sequence::text, 3, '0'),
  seed.expense_date,
  seed.category,
  seed.description,
  seed.amount,
  seed.payment_method,
  seed.vendor,
  seed.status,
  seed.notes
from expense_seed as seed
left join public.rooms as room
  on room.property_id = '00000000-0000-4000-8000-000000000001'
  and room.room_number = seed.room_number;

with maintenance_seed (
  sequence, reported_date, category, title, description, priority, status,
  room_number, vendor, scheduled_date, completed_date, estimated_cost,
  actual_cost, resolution, notes
) as (
  values
    (1,  date '2026-07-26', 'plumbing',   'Bathroom faucet leak',           'A fictional persistent drip was reported at the bathroom faucet.',                         'urgent', 'open',        'A04', 'Demo Rapid Repair',           date '2026-07-29', null,              950000,  null,    null, 'Demo inspection is scheduled; occupancy remains unchanged.'),
    (2,  date '2026-07-24', 'ac',         'AC not cooling properly',        'The fictional room AC is operating but not reaching the selected temperature.',           'high',   'in_progress', 'B12', 'Fictional Climate Service',  date '2026-07-27', null,             1400000,  null,    null, 'Demo diagnostics are in progress for the room under maintenance.'),
    (3,  date '2026-07-18', 'electrical', 'Electrical outlet issue',        'A fictional wall outlet was reported as intermittently losing power.',                     'medium', 'completed',   'A05', 'Demo Electrical Technician', date '2026-07-19', date '2026-07-19', 550000,  500000,  'Replaced the fictional damaged outlet assembly and verified stable power.', 'Demo safety check completed after the repair.'),
    (4,  date '2026-07-16', 'cleaning',   'Shared service-area deep clean', 'A fictional deep clean was requested for the shared property service area.',                'low',    'completed',   null,  'Fictional Cleaning Crew',     date '2026-07-16', date '2026-07-16', 350000,  350000,  'Completed the fictional deep clean and routine area inspection.', 'Property-wide demo maintenance record.'),
    (5,  date '2026-07-25', 'internet',   'Wi-Fi access point issue',       'A fictional intermittent connection was reported near the room.',                          'medium', 'open',        'B09', 'Demo Network Service',         date '2026-07-30', null,              600000,  null,    null, 'Demo signal survey is scheduled.'),
    (6,  date '2026-07-10', 'furniture',  'Wardrobe hinge adjustment',      'A fictional wardrobe door was reported as slightly misaligned.',                           'low',    'cancelled',   'A11', null,                           date '2026-07-14', null,              250000,  null,    null, 'Cancelled after the fictional duplicate request was identified.'),
    (7,  date '2026-07-27', 'building',   'Water pump inspection',          'A fictional pressure fluctuation prompted a property-wide pump inspection.',               'urgent', 'in_progress', null,  'Fictional Building Systems',   date '2026-07-28', null,             2500000,  null,    null, 'Demo inspection does not change any canonical room status.'),
    (8,  date '2026-07-23', 'electrical', 'Corridor lighting repair',       'Two fictional corridor fixtures were reported as flickering.',                             'high',   'open',        null,  'Demo Electrical Technician',   date '2026-07-29', null,              800000,  null,    null, 'Property-wide fictional lighting request.'),
    (9,  date '2026-07-12', 'plumbing',   'Faucet cartridge replacement',   'A fictional minor faucet leak was reported during a room readiness check.',                 'medium', 'completed',   'A10', 'Demo Rapid Repair',            date '2026-07-13', date '2026-07-13', 700000,  650000,  'Replaced the fictional faucet cartridge and verified no further leakage.', 'Room A10 remains available according to the portfolio dataset.'),
    (10, date '2026-07-08', 'ac',         'Routine AC servicing',           'A fictional preventive AC cleaning and operating check was scheduled.',                    'low',    'completed',   'B10', 'Fictional Climate Service',    date '2026-07-09', date '2026-07-09', 500000,  450000,  'Completed the fictional cleaning and confirmed normal AC operation.', 'Room B10 remains available according to the portfolio dataset.'),
    (11, date '2026-07-21', 'appliance',  'Refrigerator operating noise',   'A fictional unusual refrigerator noise was reported for observation.',                     'low',    'open',        'A07', null,                           null,              null,              300000,  null,    null, 'Awaiting fictional service-provider assignment.'),
    (12, date '2026-07-06', 'other',      'Service-area signage review',    'A fictional request proposed replacing shared service-area signage.',                      'medium', 'cancelled',   null,  null,                           null,              null,              null,    null,    null, 'Cancelled after the fictional requirement was withdrawn.')
)
insert into public.maintenance_records (
  id, property_id, room_id, reference, reported_date, category, title,
  description, priority, status, vendor, scheduled_date, completed_date,
  estimated_cost, actual_cost, resolution, notes
)
select
  md5('maintenance-demo-' || lpad(seed.sequence::text, 3, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001',
  room.id,
  'EH-MNT-DEMO-' || lpad(seed.sequence::text, 3, '0'),
  seed.reported_date,
  seed.category,
  seed.title,
  seed.description,
  seed.priority,
  seed.status,
  seed.vendor,
  seed.scheduled_date,
  seed.completed_date,
  seed.estimated_cost,
  seed.actual_cost,
  seed.resolution,
  seed.notes
from maintenance_seed as seed
left join public.rooms as room
  on room.property_id = '00000000-0000-4000-8000-000000000001'
  and room.room_number = seed.room_number;

commit;

