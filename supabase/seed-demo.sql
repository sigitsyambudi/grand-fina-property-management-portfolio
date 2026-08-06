-- Fictional local-only operational records for authenticated read-layer validation.
-- Property identity, room configuration, rates, and occupancy are defined in the
-- public-safe seed.sql. Every identity and activity record below is fictional.

with tenant_seed (
  sequence,
  full_name,
  preferred_name,
  occupation,
  company_or_institution,
  notes
) as (
  values
    (1,  'Arga Pranata',       'Arga',   'Graphic designer',         'Demo Organization 01', 'Prefers concise operational notices by text message.'),
    (2,  'Citra Maheswari',    'Citra',  'Accountant',               'Demo Organization 02', 'Standard contact preference recorded for this fictional profile.'),
    (3,  'Dimas Kurniawan',    'Dimas',  'Teacher',                  'Demo Institution 03',  'No additional operational notes.'),
    (4,  'Nabila Larasati',    'Nabila', 'Research assistant',       'Demo Institution 04',  'Prefers notices during standard daytime hours.'),
    (5,  'Reza Adinata',       'Reza',   'Sales coordinator',        'Demo Organization 05', 'No additional operational notes.'),
    (6,  'Sari Wulandari',     'Sari',   'Nurse',                    'Demo Institution 06',  'Shift-work contact preference noted for this fictional profile.'),
    (7,  'Fajar Nugroho',      'Fajar',  'Site supervisor',          'Demo Organization 07', 'Prefers advance notice for routine room access.'),
    (8,  'Maya Anggraini',     'Maya',   'Administrative officer',   'Demo Organization 08', 'No additional operational notes.'),
    (9,  'Bima Santoso',       'Bima',   'Technician',               'Demo Organization 09', 'Standard contact preference recorded for this fictional profile.'),
    (10, 'Lestari Puspita',    'Tari',   'Customer service officer', 'Demo Organization 10', 'Prefers concise operational notices by text message.'),
    (11, 'Raka Permana',       'Raka',   'Civil engineer',           'Demo Organization 11', 'No additional operational notes.'),
    (12, 'Intan Safitri',      'Intan',  'Pharmacy assistant',       'Demo Institution 12',  'Prefers notices during standard daytime hours.'),
    (13, 'Galih Ramadhan',     'Galih',  'Procurement officer',      'Demo Organization 13', 'Standard contact preference recorded for this fictional profile.'),
    (14, 'Putri Anindya',      'Putri',  'Laboratory assistant',     'Demo Institution 14',  'No additional operational notes.'),
    (15, 'Yoga Prakoso',       'Yoga',   'Logistics coordinator',    'Demo Organization 15', 'Prefers advance notice for routine room access.'),
    (16, 'Amel Kartika',       'Amel',   'Project administrator',    'Demo Organization 16', 'Standard contact preference recorded for this fictional profile.'),
    (17, 'Bayu Firmansyah',    'Bayu',   'Field coordinator',        'Demo Organization 17', 'No additional operational notes.'),
    (18, 'Dewi Kencana',       'Dewi',   'Office manager',           'Demo Organization 18', 'Prefers concise operational notices by text message.'),
    (19, 'Kirana Ayuningtyas', 'Kirana', 'Communications officer',   'Demo Organization 19', 'No additional operational notes.'),
    (20, 'Naufal Hidayat',     'Naufal', 'Software tester',          'Demo Organization 20', 'Standard contact preference recorded for this fictional profile.')
)
insert into public.tenants (
  id,
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
select
  md5('tenant-demo-' || lpad(sequence::text, 3, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001',
  full_name,
  preferred_name,
  '+62 000 1000 ' || lpad(sequence::text, 2, '0'),
  case
    when sequence % 3 = 0 then null
    else 'tenant.' || lpad(sequence::text, 2, '0') || '@example.com'
  end,
  'Fictional Contact ' || lpad(sequence::text, 2, '0'),
  '+62 000 9000 ' || lpad(sequence::text, 2, '0'),
  occupation,
  company_or_institution,
  'active',
  notes
from tenant_seed;

with occupied_rooms as (
  select
    id,
    monthly_rate,
    row_number() over (order by sort_order)::integer as sequence
  from public.rooms
  where property_id = '00000000-0000-4000-8000-000000000001'
    and status = 'occupied'
)
insert into public.leases (
  id,
  property_id,
  tenant_id,
  room_id,
  status,
  start_date,
  end_date,
  monthly_rent,
  billing_day,
  deposit_amount,
  notes
)
select
  md5('lease-demo-' || lpad(sequence::text, 3, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001',
  md5('tenant-demo-' || lpad(sequence::text, 3, '0'))::uuid,
  id,
  'active',
  (date '2024-06-01' + ((sequence - 1) || ' months')::interval)::date,
  make_date(2027, ((sequence - 1) % 12) + 1, 28),
  monthly_rate,
  (array[1, 5, 10])[((sequence - 1) % 3) + 1],
  null,
  'Fictional lease timing for interface validation. Operational terms require owner confirmation before persistence.'
from occupied_rooms;

with active_leases as (
  select
    id,
    monthly_rent,
    billing_day,
    row_number() over (order by start_date, id)::integer as sequence
  from public.leases
  where property_id = '00000000-0000-4000-8000-000000000001'
    and status = 'active'
)
insert into public.invoices (
  id,
  property_id,
  lease_id,
  reference,
  billing_period,
  issue_date,
  due_date,
  amount,
  status,
  notes
)
select
  md5('invoice-demo-202607-' || lpad(sequence::text, 3, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001',
  id,
  'EH-INV-202607-' || lpad(sequence::text, 3, '0'),
  date '2026-07-01',
  date '2026-06-25',
  make_date(2026, 7, billing_day),
  monthly_rent,
  'issued',
  'Fictional July 2026 rent invoice for interface validation. Payment records do not represent actual collections.'
from active_leases;

with active_leases as (
  select
    id,
    monthly_rent,
    billing_day,
    row_number() over (order by start_date, id)::integer as sequence
  from public.leases
  where property_id = '00000000-0000-4000-8000-000000000001'
    and status = 'active'
),
payment_amounts as (
  select
    sequence,
    case
      when billing_day = 10 and (sequence - 1) % 2 = 1
        then floor(monthly_rent / 2.0)::bigint
      when billing_day <> 10 and (sequence - 1) % 2 = 0
        then monthly_rent
      else null
    end as amount
  from active_leases
),
payment_parts as (
  select sequence, 1 as part, amount
  from payment_amounts
  where amount is not null and sequence <> 6
  union all
  select sequence, part, floor(amount / 2.0)::bigint
  from payment_amounts
  cross join (values (1), (2)) as parts(part)
  where sequence = 6
),
numbered_payments as (
  select
    sequence as lease_sequence,
    part,
    amount,
    row_number() over (order by sequence, part)::integer as payment_sequence
  from payment_parts
)
insert into public.payments (
  id,
  property_id,
  invoice_id,
  reference,
  amount,
  payment_date,
  method,
  status,
  notes
)
select
  md5('payment-demo-202607-' || lpad(payment_sequence::text, 3, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001',
  md5('invoice-demo-202607-' || lpad(lease_sequence::text, 3, '0'))::uuid,
  'EH-PAY-DEMO-202607-' || lpad(payment_sequence::text, 3, '0'),
  amount,
  make_date(2026, 7, ((payment_sequence - 1) % 5) + 1),
  (array['bank_transfer', 'cash', 'e_wallet', 'other'])[
    ((payment_sequence - 1) % 4) + 1
  ],
  'completed',
  case
    when part > 1 then
      'Fictional split payment part ' || part || ' for interface validation.'
    else 'Fictional completed payment for interface validation.'
  end
from numbered_payments;

update public.invoices as invoice
set status = case
  when payment.total_paid = invoice.amount then 'paid'
  when invoice.due_date < date '2026-07-06' and invoice.amount > coalesce(payment.total_paid, 0)
    then 'overdue'
  when coalesce(payment.total_paid, 0) > 0 then 'partially_paid'
  else 'issued'
end
from (
  select invoice_id, sum(amount) as total_paid
  from public.payments
  where status = 'completed'
  group by invoice_id
) as payment
where invoice.id = payment.invoice_id;

update public.invoices
set status = 'overdue'
where due_date < date '2026-07-06'
  and id not in (select invoice_id from public.payments);

with expense_seed (
  sequence, expense_date, category, description, amount, payment_method,
  vendor, room_number, status, notes
) as (
  values
    (1,  date '2026-07-02', 'utilities',   'Property electricity and water service', 4800000, 'bank_transfer', 'Fictional Utility Vendor',       null,  'recorded', 'Fictional property-wide utility expense for interface validation.'),
    (2,  date '2026-07-04', 'maintenance', 'Demo plumbing repair',                    850000,  'cash',          'Demo Maintenance Provider',     'A04', 'recorded', 'Fictional room-specific maintenance expense.'),
    (3,  date '2026-07-05', 'internet',    'Property internet service',               1250000, 'bank_transfer', 'Fictional Internet Provider',    null,  'recorded', 'Fictional shared internet service expense.'),
    (4,  date '2026-07-07', 'cleaning',    'Common-area cleaning service',            1100000, 'e_wallet',      'Demo Cleaning Service',          null,  'recorded', 'Fictional cleaning expense for shared property areas.'),
    (5,  date '2026-07-08', 'supplies',    'Replacement room supplies',                475000,  'cash',          'Fictional Property Supplies',    'A05', 'recorded', 'Fictional room-specific supplies purchase.'),
    (6,  date '2026-07-10', 'payroll',     'Property support payroll',                6000000, 'bank_transfer', 'Demo Internal Payroll',          null,  'recorded', 'Fictional aggregate payroll expense; no employee identity or banking data is included.'),
    (7,  date '2026-07-12', 'security',    'Property security service',               2400000, 'bank_transfer', 'Fictional Security Provider',     null,  'recorded', 'Fictional property-wide security service expense.'),
    (8,  date '2026-07-14', 'other',       'Administrative service charge',            650000,  'other',         'Demo Administration Vendor',     null,  'pending',  'Fictional pending administrative expense.'),
    (9,  date '2026-07-16', 'utilities',   'Room utility equipment service',           900000,  'bank_transfer', 'Fictional Utility Vendor',        'B09', 'pending',  'Fictional pending room-specific utility expense.'),
    (10, date '2026-07-18', 'maintenance', 'Demo air-conditioning service',           1350000, 'e_wallet',      'Demo Maintenance Provider',      'B03', 'recorded', 'Fictional room-specific maintenance expense.'),
    (11, date '2026-07-20', 'internet',    'Network equipment service',                300000,  'cash',          'Fictional Internet Provider',     null,  'recorded', 'Fictional shared network service expense.'),
    (12, date '2026-07-22', 'cleaning',    'Room deep-cleaning service',               425000,  'cash',          'Demo Cleaning Service',          'A11', 'pending',  'Fictional pending room-specific cleaning expense.'),
    (13, date '2026-07-24', 'supplies',    'Shared cleaning and office supplies',      725000,  'e_wallet',      'Fictional Property Supplies',     null,  'recorded', 'Fictional property-wide supplies expense.'),
    (14, date '2026-07-25', 'taxes_fees',  'Administrative permit fee',               1800000, 'bank_transfer', 'Demo Administrative Office',      null,  'void',     'Fictional void expense retained to demonstrate an auditable correction state.')
)
insert into public.expenses (
  id, property_id, room_id, reference, expense_date, category, description,
  amount, payment_method, vendor, status, notes
)
select
  md5('expense-demo-' || lpad(seed.sequence::text, 3, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001',
  room.id,
  'EH-EXP-DEMO-202607-' || lpad(seed.sequence::text, 3, '0'),
  seed.expense_date,
  seed.category,
  seed.description,
  seed.amount,
  seed.payment_method,
  seed.vendor,
  seed.status,
  seed.notes
from expense_seed as seed
left join public.rooms as room
  on room.property_id = '00000000-0000-4000-8000-000000000001'
  and room.room_number = seed.room_number;

with maintenance_seed (
  sequence, reported_date, category, title, description, priority, status,
  room_number, vendor, scheduled_date, completed_date, estimated_cost,
  actual_cost, resolution, notes
) as (
  values
    (1,  date '2026-07-26', 'plumbing',   'Bathroom faucet leak',           'A fictional persistent drip was reported at the bathroom faucet.',                         'urgent', 'open',        'A04', 'Demo Rapid Repair',           date '2026-07-29', null,              950000,  null,    null, 'Demo inspection is scheduled; occupancy remains unchanged.'),
    (2,  date '2026-07-24', 'ac',         'AC not cooling properly',        'The fictional room AC is operating but not reaching the selected temperature.',           'high',   'in_progress', 'B12', 'Fictional Climate Service',  date '2026-07-27', null,             1400000,  null,    null, 'Demo diagnostics are in progress for the room under maintenance.'),
    (3,  date '2026-07-18', 'electrical', 'Electrical outlet issue',        'A fictional wall outlet was reported as intermittently losing power.',                     'medium', 'completed',   'A05', 'Demo Electrical Technician', date '2026-07-19', date '2026-07-19', 550000,  500000,  'Replaced the fictional damaged outlet assembly and verified stable power.', 'Demo safety check completed after the repair.'),
    (4,  date '2026-07-16', 'cleaning',   'Shared service-area deep clean', 'A fictional deep clean was requested for the shared property service area.',                'low',    'completed',   null,  'Fictional Cleaning Crew',     date '2026-07-16', date '2026-07-16', 350000,  350000,  'Completed the fictional deep clean and routine area inspection.', 'Property-wide demo maintenance record.'),
    (5,  date '2026-07-25', 'internet',   'Wi-Fi access point issue',       'A fictional intermittent connection was reported near the room.',                          'medium', 'open',        'B09', 'Demo Network Service',         date '2026-07-30', null,              600000,  null,    null, 'Demo signal survey is scheduled.'),
    (6,  date '2026-07-10', 'furniture',  'Wardrobe hinge adjustment',      'A fictional wardrobe door was reported as slightly misaligned.',                           'low',    'cancelled',   'A11', null,                           date '2026-07-14', null,              250000,  null,    null, 'Cancelled after the fictional duplicate request was identified.'),
    (7,  date '2026-07-27', 'building',   'Water pump inspection',          'A fictional pressure fluctuation prompted a property-wide pump inspection.',               'urgent', 'in_progress', null,  'Fictional Building Systems',   date '2026-07-28', null,             2500000,  null,    null, 'Demo inspection does not change any canonical room status.'),
    (8,  date '2026-07-23', 'electrical', 'Corridor lighting repair',       'Two fictional corridor fixtures were reported as flickering.',                             'high',   'open',        null,  'Demo Electrical Technician',   date '2026-07-29', null,              800000,  null,    null, 'Property-wide fictional lighting request.'),
    (9,  date '2026-07-12', 'plumbing',   'Faucet cartridge replacement',   'A fictional minor faucet leak was reported during a room readiness check.',                 'medium', 'completed',   'A10', 'Demo Rapid Repair',            date '2026-07-13', date '2026-07-13', 700000,  650000,  'Replaced the fictional faucet cartridge and verified no further leakage.', 'Room A10 remains available according to the portfolio dataset.'),
    (10, date '2026-07-08', 'ac',         'Routine AC servicing',           'A fictional preventive AC cleaning and operating check was scheduled.',                    'low',    'completed',   'B10', 'Fictional Climate Service',    date '2026-07-09', date '2026-07-09', 500000,  450000,  'Completed the fictional cleaning and confirmed normal AC operation.', 'Room B10 remains available according to the portfolio dataset.'),
    (11, date '2026-07-21', 'appliance',  'Refrigerator operating noise',   'A fictional unusual refrigerator noise was reported for observation.',                     'low',    'open',        'A07', null,                           null,              null,              300000,  null,    null, 'Awaiting fictional service-provider assignment.'),
    (12, date '2026-07-06', 'other',      'Service-area signage review',    'A fictional request proposed replacing shared service-area signage.',                      'medium', 'cancelled',   null,  null,                           null,              null,              null,    null,    null, 'Cancelled after the fictional requirement was withdrawn.')
)
insert into public.maintenance_records (
  id, property_id, room_id, reference, reported_date, category, title,
  description, priority, status, vendor, scheduled_date, completed_date,
  estimated_cost, actual_cost, resolution, notes
)
select
  md5('maintenance-demo-' || lpad(seed.sequence::text, 3, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001',
  room.id,
  'EH-MNT-DEMO-' || lpad(seed.sequence::text, 3, '0'),
  seed.reported_date,
  seed.category,
  seed.title,
  seed.description,
  seed.priority,
  seed.status,
  seed.vendor,
  seed.scheduled_date,
  seed.completed_date,
  seed.estimated_cost,
  seed.actual_cost,
  seed.resolution,
  seed.notes
from maintenance_seed as seed
left join public.rooms as room
  on room.property_id = '00000000-0000-4000-8000-000000000001'
  and room.room_number = seed.room_number;
