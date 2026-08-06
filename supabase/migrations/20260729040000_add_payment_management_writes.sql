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
