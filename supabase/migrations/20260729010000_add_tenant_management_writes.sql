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
