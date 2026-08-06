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
