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
