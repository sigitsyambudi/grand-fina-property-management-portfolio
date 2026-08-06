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
