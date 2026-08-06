do $$
declare
  target_property_id constant uuid := '00000000-0000-4000-8000-000000000001';
begin
  if (select count(*) from public.tenants where tenants.property_id = target_property_id) <> 20 then
    raise exception 'Expected 20 fictional tenants';
  end if;

  if (select count(*) from public.leases where leases.property_id = target_property_id and status = 'active') <> 20 then
    raise exception 'Expected 20 active fictional leases';
  end if;

  if exists (
    select 1
    from public.leases
    join public.rooms on rooms.id = leases.room_id
    where leases.property_id = target_property_id
      and rooms.status <> 'occupied'
  ) then
    raise exception 'A fictional lease references a non-occupied room';
  end if;

  if (select coalesce(sum(monthly_rent), 0) from public.leases where leases.property_id = target_property_id and status = 'active') <> 46875000 then
    raise exception 'Unexpected fictional active lease value';
  end if;

  if (select count(*) from public.invoices where invoices.property_id = target_property_id and billing_period = date '2026-07-01') <> 20 then
    raise exception 'Expected 20 July 2026 fictional invoices';
  end if;

  if (select coalesce(sum(amount), 0) from public.invoices where invoices.property_id = target_property_id and billing_period = date '2026-07-01') <> 46875000 then
    raise exception 'Unexpected fictional July billed value';
  end if;

  if (select coalesce(sum(amount), 0) from public.payments where payments.property_id = target_property_id and status = 'completed') <> 19925000 then
    raise exception 'Unexpected fictional completed payment total';
  end if;

  if (
    select coalesce(sum(invoice.amount - coalesce(payment.paid_amount, 0)), 0)
    from public.invoices as invoice
    left join (
      select invoice_id, sum(amount) as paid_amount
      from public.payments
      where status = 'completed'
      group by invoice_id
    ) as payment on payment.invoice_id = invoice.id
    where invoice.property_id = target_property_id
      and invoice.billing_period = date '2026-07-01'
  ) <> 26950000 then
    raise exception 'Unexpected fictional outstanding balance';
  end if;

  if (select count(*) from public.expenses where expenses.property_id = target_property_id) <> 14 then
    raise exception 'Expected 14 fictional expenses';
  end if;

  if (select coalesce(sum(amount), 0) from public.expenses where expenses.property_id = target_property_id and status = 'recorded') <> 19250000 then
    raise exception 'Expected recorded fictional expenses of 19,250,000 IDR';
  end if;

  if (select coalesce(sum(amount), 0) from public.expenses where expenses.property_id = target_property_id and status = 'pending') <> 1975000 then
    raise exception 'Expected pending fictional expenses of 1,975,000 IDR';
  end if;

  if (select count(*) from public.maintenance_records where maintenance_records.property_id = target_property_id) <> 12 then
    raise exception 'Expected 12 fictional maintenance records';
  end if;

  if (
    select row(count(*) filter (where status = 'open'),
               count(*) filter (where status = 'in_progress'),
               count(*) filter (where status = 'completed'),
               count(*) filter (where status = 'cancelled'))
    from public.maintenance_records
    where maintenance_records.property_id = target_property_id
  ) <> row(4::bigint, 2::bigint, 4::bigint, 2::bigint) then
    raise exception 'Unexpected fictional maintenance status counts';
  end if;
end
$$;
