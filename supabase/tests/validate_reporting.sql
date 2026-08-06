do $$
declare
  target_property_id constant uuid := '00000000-0000-4000-8000-000000000001';
  july_period constant date := date '2026-07-01';
  invoiced_amount bigint;
  received_amount bigint;
  outstanding_amount bigint;
  recorded_expense_amount bigint;
begin
  select coalesce(sum(amount), 0)
  into invoiced_amount
  from public.invoices
  where property_id = target_property_id
    and billing_period = july_period
    and status not in ('draft', 'void');

  select coalesce(sum(amount), 0)
  into received_amount
  from public.payments
  where property_id = target_property_id
    and status = 'completed'
    and payment_date >= july_period
    and payment_date < july_period + interval '1 month';

  select coalesce(sum(invoice.amount - coalesce(payment.paid_amount, 0)), 0)
  into outstanding_amount
  from public.invoices as invoice
  left join (
    select invoice_id, sum(amount) as paid_amount
    from public.payments
    where status = 'completed'
    group by invoice_id
  ) as payment on payment.invoice_id = invoice.id
  where invoice.property_id = target_property_id
    and invoice.billing_period = july_period
    and invoice.status not in ('draft', 'void');

  select coalesce(sum(amount), 0)
  into recorded_expense_amount
  from public.expenses
  where property_id = target_property_id
    and status = 'recorded'
    and expense_date >= july_period
    and expense_date < july_period + interval '1 month';

  if invoiced_amount <> 46875000 then
    raise exception 'Unexpected fictional July invoiced amount: %',
      invoiced_amount;
  end if;

  if received_amount <> 19925000 then
    raise exception 'Unexpected fictional July received amount: %',
      received_amount;
  end if;

  if outstanding_amount <> 26950000 then
    raise exception 'Unexpected fictional July outstanding amount: %',
      outstanding_amount;
  end if;

  if recorded_expense_amount <> 19250000 then
    raise exception 'Expected July recorded expenses of 19,250,000 IDR, got %',
      recorded_expense_amount;
  end if;

  if received_amount - recorded_expense_amount <> 675000 then
    raise exception 'Unexpected fictional July net cash flow';
  end if;

  if not exists (
    select 1
    from public.invoices as invoice
    left join (
      select invoice_id, sum(amount) as paid_amount
      from public.payments
      where status = 'completed'
      group by invoice_id
    ) as payment on payment.invoice_id = invoice.id
    where invoice.property_id = target_property_id
      and invoice.billing_period = july_period
      and coalesce(payment.paid_amount, 0) = 0
      and invoice.amount > 0
  ) then
    raise exception 'Expected an unpaid invoice scenario';
  end if;

  if not exists (
    select 1
    from public.invoices as invoice
    join (
      select invoice_id, sum(amount) as paid_amount
      from public.payments
      where status = 'completed'
      group by invoice_id
    ) as payment on payment.invoice_id = invoice.id
    where invoice.property_id = target_property_id
      and invoice.billing_period = july_period
      and payment.paid_amount > 0
      and payment.paid_amount < invoice.amount
  ) then
    raise exception 'Expected a partially paid invoice scenario';
  end if;

  if not exists (
    select 1
    from public.invoices as invoice
    join (
      select invoice_id, sum(amount) as paid_amount
      from public.payments
      where status = 'completed'
      group by invoice_id
    ) as payment on payment.invoice_id = invoice.id
    where invoice.property_id = target_property_id
      and invoice.billing_period = july_period
      and payment.paid_amount = invoice.amount
  ) then
    raise exception 'Expected a fully paid invoice scenario';
  end if;

  if exists (
    select 1
    from public.invoices as invoice
    join (
      select invoice_id, sum(amount) as paid_amount
      from public.payments
      where status = 'completed'
      group by invoice_id
    ) as payment on payment.invoice_id = invoice.id
    where invoice.property_id = target_property_id
      and payment.paid_amount > invoice.amount
  ) then
    raise exception 'A completed payment allocation exceeds its invoice amount';
  end if;

  if (
    select coalesce(sum(amount), 0)
    from public.invoices
    where property_id = target_property_id
      and billing_period = date '2026-08-01'
      and status not in ('draft', 'void')
  ) <> 0 then
    raise exception 'August invoice-period isolation failed';
  end if;

  if (
    select coalesce(sum(amount), 0)
    from public.payments
    where property_id = target_property_id
      and status = 'completed'
      and payment_date >= date '2026-08-01'
      and payment_date < date '2026-09-01'
  ) <> 0 then
    raise exception 'August payment-date isolation failed';
  end if;

  if (
    select coalesce(sum(amount), 0)
    from public.expenses
    where property_id = target_property_id
      and status = 'recorded'
      and expense_date >= date '2026-08-01'
      and expense_date < date '2026-09-01'
  ) <> 0 then
    raise exception 'August expense-date isolation failed';
  end if;

  if (
    select coalesce(sum(actual_cost), 0)
    from public.maintenance_records
    where property_id = target_property_id
  ) = 0 then
    raise exception 'Expected maintenance actual-cost data for double-count test';
  end if;

  if received_amount - recorded_expense_amount <> 675000 then
    raise exception 'Maintenance costs were incorrectly included in net cash flow';
  end if;
end
$$;
