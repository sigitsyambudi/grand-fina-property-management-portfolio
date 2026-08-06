do $$
declare
  portfolio_property_id constant uuid := '00000000-0000-4000-8000-000000000001';
begin
  if (select count(*) from public.properties) <> 1 then
    raise exception 'Expected exactly 1 portfolio property';
  end if;

  if not exists (select 1 from public.properties where id = portfolio_property_id and name = 'Emerald Haven Residence') then
    raise exception 'Expected the fictional portfolio property identity';
  end if;

  if (select count(*) from public.rooms where property_id = portfolio_property_id) <> 24 then
    raise exception 'Expected exactly 24 portfolio rooms';
  end if;

  if (
    select row(count(*) filter (where status = 'occupied'),
               count(*) filter (where status = 'available'),
               count(*) filter (where status = 'maintenance'))
    from public.rooms where property_id = portfolio_property_id
  ) <> row(20::bigint, 3::bigint, 1::bigint) then
    raise exception 'Unexpected portfolio occupancy counts';
  end if;

  if (select array_agg(room_number order by sort_order) from public.rooms where property_id = portfolio_property_id and status = 'available') <> array['A10', 'B10', 'B11']::text[] then
    raise exception 'Unexpected available room set';
  end if;

  if (select array_agg(room_number order by sort_order) from public.rooms where property_id = portfolio_property_id and status = 'maintenance') <> array['B12']::text[] then
    raise exception 'Unexpected maintenance room set';
  end if;

  if exists (select 1 from public.rooms where property_id = portfolio_property_id and room_number !~ '^[AB](0[1-9]|1[0-2])$') then
    raise exception 'A room number falls outside the public A01-A12/B01-B12 plan';
  end if;

  if (
    select row(count(*) filter (where location = 'North Wing'),
               count(*) filter (where location = 'South Wing'),
               count(*) filter (where floor = 1),
               count(*) filter (where floor = 2))
    from public.rooms where property_id = portfolio_property_id
  ) <> row(12::bigint, 12::bigint, 12::bigint, 12::bigint) then
    raise exception 'Unexpected building or floor distribution';
  end if;

  if exists (
    select 1
    from public.rooms
    where property_id = portfolio_property_id
      and not (
        (room_number ~ '^A0[1-6]$' and location = 'North Wing' and floor = 1)
        or (room_number ~ '^A(0[7-9]|1[0-2])$' and location = 'North Wing' and floor = 2)
        or (room_number ~ '^B0[1-6]$' and location = 'South Wing' and floor = 1)
        or (room_number ~ '^B(0[7-9]|1[0-2])$' and location = 'South Wing' and floor = 2)
      )
  ) then
    raise exception 'A portfolio room has an invalid location/floor combination';
  end if;

  begin
    update public.rooms
    set location = 'South Wing', floor = 1
    where property_id = portfolio_property_id and room_number = 'A01';

    raise exception 'The database accepted an invalid portfolio room configuration';
  exception
    when check_violation then
      null;
  end;

  if (select sum(monthly_rate) from public.rooms where property_id = portfolio_property_id) <> 57300000 then
    raise exception 'Unexpected fictional full room rate total';
  end if;

  if (select sum(monthly_rate) from public.rooms where property_id = portfolio_property_id and status = 'occupied') <> 46875000 then
    raise exception 'Unexpected fictional occupied-room rate total';
  end if;

  if (select sum(monthly_rate) from public.rooms where property_id = portfolio_property_id and status = 'available') <> 7750000 then
    raise exception 'Unexpected fictional vacancy rate total';
  end if;

  if (select sum(monthly_rate) from public.rooms where property_id = portfolio_property_id and status = 'maintenance') <> 2675000 then
    raise exception 'Unexpected fictional maintenance-room rate total';
  end if;
end;
$$;
