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
