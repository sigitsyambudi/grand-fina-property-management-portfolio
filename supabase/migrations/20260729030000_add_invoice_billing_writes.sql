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
