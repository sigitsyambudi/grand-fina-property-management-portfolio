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
