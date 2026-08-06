import { createClient } from "@supabase/supabase-js";
import { cleanupLocalDomainFixtures } from "./local-auth-fixtures.mjs";

const GRAND_FINA_PROPERTY_ID = "00000000-0000-4000-8000-000000000001";
const ROOM_ONE_ID = "00000000-0000-4000-8100-000000000001";
const CROSS_PROPERTY_TENANT_ID = "ffffffff-ffff-4fff-8fff-fffffffff002";
const CROSS_PROPERTY_ROOM_ID = "ffffffff-ffff-4fff-8fff-fffffffff003";
const CROSS_PROPERTY_LEASE_ID = "ffffffff-ffff-4fff-8fff-fffffffff004";
const CROSS_PROPERTY_INVOICE_ID = "ffffffff-ffff-4fff-8fff-fffffffff005";
const TENANT_TEST_EMAILS = {
  owner: "tenant-owner-validation@example.com",
  admin: "tenant-admin-validation@example.com",
};
const LEASE_CONFLICT_TENANT_EMAILS = {
  owner: "lease-owner-conflict@example.com",
  admin: "lease-admin-conflict@example.com",
};
const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "localhost", "::1"]);
const MEMBER_IDENTITIES = [
  { email: "portfolio-owner@example.com", role: "owner" },
  { email: "portfolio-admin@example.com", role: "admin" },
  { email: "portfolio-staff@example.com", role: "staff" },
];
const PROPERTY_TABLES = [
  "properties",
  "rooms",
  "tenants",
  "leases",
  "invoices",
  "payments",
  "expenses",
  "maintenance_records",
];
const VALIDATION_DATE = new Date().toISOString().slice(0, 10);
const VALIDATION_DATE_COMPACT_MONTH = VALIDATION_DATE.slice(0, 7).replace(
  "-",
  "",
);

function futureBillingPeriod(monthOffset) {
  const now = new Date();
  const period = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1),
  );
  return period.toISOString().slice(0, 7);
}

function requireLocalConfiguration() {
  const rawUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const password = process.env.GF_LOCAL_TEST_PASSWORD;

  if (!rawUrl || !publishableKey || !password) {
    throw new Error(
      "Set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and GF_LOCAL_TEST_PASSWORD.",
    );
  }

  const url = new URL(rawUrl);
  if (!LOCAL_HOSTNAMES.has(url.hostname)) {
    throw new Error("Refusing to run authentication checks outside localhost.");
  }

  return { url: url.toString(), publishableKey, password };
}

function createLocalClient(url, publishableKey) {
  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertAnonymousIsolation(configuration) {
  const client = createLocalClient(
    configuration.url,
    configuration.publishableKey,
  );

  for (const table of ["profiles", "property_members", ...PROPERTY_TABLES]) {
    const { data, error } = await client.from(table).select("*").limit(1);
    assert(
      Boolean(error) || !data || data.length === 0,
      `Anonymous access exposed data from ${table}.`,
    );
  }

  const anonymousUpdate = await client
    .from("rooms")
    .update({ monthly_rate: 1701000 })
    .eq("id", ROOM_ONE_ID)
    .select("id");
  assert(
    Boolean(anonymousUpdate.error) || anonymousUpdate.data?.length === 0,
    "Anonymous access could update a room.",
  );
  const anonymousTenantInsert = await client.from("tenants").insert({
    property_id: GRAND_FINA_PROPERTY_ID,
    full_name: "Anonymous Tenant Test",
    status: "pending",
  });
  assert(
    Boolean(anonymousTenantInsert.error),
    "Anonymous access could create a tenant.",
  );
  const anonymousLeaseInsert = await client.from("leases").insert({
    property_id: GRAND_FINA_PROPERTY_ID,
    tenant_id: "ffffffff-ffff-4fff-8fff-fffffffffff1",
    room_id: ROOM_ONE_ID,
    status: "active",
    start_date: "2026-07-01",
    monthly_rent: 2135000,
    billing_day: 1,
  });
  assert(
    Boolean(anonymousLeaseInsert.error),
    "Anonymous access could create a lease.",
  );
  const anonymousInvoiceInsert = await client.from("invoices").insert({
    property_id: GRAND_FINA_PROPERTY_ID,
    lease_id: CROSS_PROPERTY_LEASE_ID,
    billing_period: "2026-08-01",
    issue_date: "2026-07-29",
    due_date: "2026-08-05",
    amount: 2135000,
  });
  assert(
    Boolean(anonymousInvoiceInsert.error),
    "Anonymous access could create an invoice.",
  );
  const anonymousPaymentInsert = await client.from("payments").insert({
    property_id: GRAND_FINA_PROPERTY_ID,
    invoice_id: CROSS_PROPERTY_INVOICE_ID,
    payment_date: "2026-07-29",
    amount: 1,
    method: "cash",
    notes: "Fictional local Milestone 18 validation anonymous denial.",
  });
  assert(
    Boolean(anonymousPaymentInsert.error),
    "Anonymous access could record a payment.",
  );
  const anonymousExpenseInsert = await client.from("expenses").insert({
    property_id: GRAND_FINA_PROPERTY_ID,
    expense_date: "2026-07-30",
    category: "supplies",
    description: "Anonymous expense test",
    amount: 1,
    payment_method: "cash",
    status: "pending",
  });
  assert(
    Boolean(anonymousExpenseInsert.error),
    "Anonymous access could create an expense.",
  );
  const anonymousMaintenanceInsert = await client
    .from("maintenance_records")
    .insert({
      property_id: GRAND_FINA_PROPERTY_ID,
      reported_date: "2026-07-30",
      category: "plumbing",
      title: "Anonymous maintenance test",
      description: "Fictional anonymous maintenance validation.",
      priority: "medium",
      status: "open",
    });
  assert(
    Boolean(anonymousMaintenanceInsert.error),
    "Anonymous access could create maintenance.",
  );

  console.log("PASS anonymous property-data isolation");
}

async function signIn(configuration, email) {
  const client = createLocalClient(
    configuration.url,
    configuration.publishableKey,
  );
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: configuration.password,
  });

  assert(!error && Boolean(data.user), `Sign-in failed for ${email}.`);
  return { client, user: data.user };
}

async function assertMemberAccess(configuration, identity) {
  const { client, user } = await signIn(configuration, identity.email);
  const { data: profiles, error: profileError } = await client
    .from("profiles")
    .select("id, display_name, role");
  assert(!profileError && profiles?.length === 1, "Own profile was not visible.");
  assert(profiles[0].id === user.id, "A member could read another profile.");
  assert(profiles[0].role === identity.role, "Profile role did not match.");

  const { data: memberships, error: membershipError } = await client
    .from("property_members")
    .select("profile_id, property_id, role");
  assert(
    !membershipError && memberships?.length === 1,
    "Own property membership was not visible.",
  );
  assert(
    memberships[0].profile_id === user.id &&
      memberships[0].property_id === GRAND_FINA_PROPERTY_ID &&
      memberships[0].role === identity.role,
    "Property membership did not match the signed-in member.",
  );

  for (const table of PROPERTY_TABLES) {
    const { data, error } = await client.from(table).select("id").limit(1);
    assert(!error && Array.isArray(data), `${table} was not readable.`);
  }

  await assertRoomWritePermissions(client, identity.role);
  await assertTenantWritePermissions(client, identity.role);
  await assertLeaseWritePermissions(client, identity.role);
  await assertInvoiceWritePermissions(client, identity.role);
  await assertPaymentWritePermissions(client, identity.role);
  await assertExpenseWritePermissions(client, identity.role);
  await assertMaintenanceWritePermissions(client, identity.role);
  await client.auth.signOut();
  console.log(`PASS ${identity.role} member access and isolation`);
}

async function assertTenantWritePermissions(client, role) {
  if (role === "staff") {
    const staffInsert = await client.from("tenants").insert({
      property_id: GRAND_FINA_PROPERTY_ID,
      full_name: "Staff Tenant Test",
      status: "pending",
    });
    const { data: existingTenant, error: tenantError } = await client
      .from("tenants")
      .select("id")
      .eq("status", "active")
      .limit(1)
      .single();
    assert(!tenantError && existingTenant, "Staff could not read tenants.");
    const staffUpdate = await client
      .from("tenants")
      .update({ preferred_name: "Staff update denied" })
      .eq("id", existingTenant.id)
      .select("id");
    assert(
      Boolean(staffInsert.error) &&
        (Boolean(staffUpdate.error) || staffUpdate.data?.length === 0),
      "Staff could create or update a tenant.",
    );
    return;
  }

  const fixtureEmail = TENANT_TEST_EMAILS[role];
  assert(Boolean(fixtureEmail), `No tenant fixture email exists for ${role}.`);
  const { data: createdTenant, error: createError } = await client
    .from("tenants")
    .insert({
      property_id: GRAND_FINA_PROPERTY_ID,
      full_name: `${role} Tenant Validation`,
      preferred_name: null,
      phone: "+62 811 0000 1500",
      email: fixtureEmail,
      emergency_contact_name: "Emergency Validation",
      emergency_contact_phone: "+62 811 0000 1599",
      occupation: "Local validation",
      company_or_institution: "Emerald Haven Demo",
      status: "pending",
      notes: "Fictional local Milestone 15 validation record.",
    })
    .select("id, status")
    .single();
  assert(
    !createError && createdTenant?.status === "pending",
    `${role} could not create a pending tenant.`,
  );

  const { data: updatedTenant, error: updateError } = await client
    .from("tenants")
    .update({ preferred_name: `${role} updated` })
    .eq("id", createdTenant.id)
    .select("preferred_name")
    .single();
  assert(
    !updateError && updatedTenant?.preferred_name === `${role} updated`,
    `${role} could not update a tenant-owned field.`,
  );

  const statusUpdate = await client
    .from("tenants")
    .update({ status: "active" })
    .eq("id", createdTenant.id);
  const propertyUpdate = await client
    .from("tenants")
    .update({ property_id: "ffffffff-ffff-4fff-8fff-ffffffffffff" })
    .eq("id", createdTenant.id);
  const invalidEmailInsert = await client.from("tenants").insert({
    property_id: GRAND_FINA_PROPERTY_ID,
    full_name: "Invalid Email Tenant Test",
    email: "not-an-email",
    status: "pending",
  });
  const activeInsert = await client.from("tenants").insert({
    property_id: GRAND_FINA_PROPERTY_ID,
    full_name: "Invalid Active Tenant Test",
    status: "active",
  });
  assert(
    Boolean(statusUpdate.error) &&
      Boolean(propertyUpdate.error) &&
      Boolean(invalidEmailInsert.error) &&
      Boolean(activeInsert.error),
    `${role} could bypass protected tenant fields or database validation.`,
  );
}

async function assertLeaseWritePermissions(client, role) {
  if (role === "staff") {
    const [
      { data: existingLease, error: leaseError },
      { data: eligibleTenant, error: tenantError },
      { data: eligibleRoom, error: roomError },
    ] = await Promise.all([
      client
        .from("leases")
        .select("id, billing_day")
        .eq("status", "active")
        .limit(1)
        .single(),
      client
        .from("tenants")
        .select("id")
        .eq("property_id", GRAND_FINA_PROPERTY_ID)
        .eq("status", "pending")
        .order("created_at")
        .limit(1)
        .maybeSingle(),
      client
        .from("rooms")
        .select("id, monthly_rate")
        .eq("property_id", GRAND_FINA_PROPERTY_ID)
        .eq("status", "available")
        .order("sort_order")
        .limit(1)
        .maybeSingle(),
    ]);
    assert(
      !leaseError &&
        existingLease &&
        !tenantError &&
        eligibleTenant &&
        !roomError &&
        eligibleRoom,
      "Staff could not read valid lease-denial fixtures.",
    );

    const staffInsert = await client.from("leases").insert({
      property_id: GRAND_FINA_PROPERTY_ID,
      tenant_id: eligibleTenant.id,
      room_id: eligibleRoom.id,
      status: "active",
      start_date: "2026-07-01",
      end_date: "2026-12-31",
      monthly_rent: eligibleRoom.monthly_rate,
      billing_day: 1,
    });
    const staffUpdate = await client
      .from("leases")
      .update({ billing_day: existingLease.billing_day === 1 ? 2 : 1 })
      .eq("id", existingLease.id)
      .select("id");
    assert(
      Boolean(staffInsert.error) &&
        (Boolean(staffUpdate.error) || staffUpdate.data?.length === 0),
      "Staff could create or update a lease.",
    );
    return;
  }

  const fixtureEmail = TENANT_TEST_EMAILS[role];
  const conflictEmail = LEASE_CONFLICT_TENANT_EMAILS[role];
  assert(
    Boolean(fixtureEmail) && Boolean(conflictEmail),
    `No lease fixture configuration exists for ${role}.`,
  );

  const { data: tenant, error: tenantError } = await client
    .from("tenants")
    .select("id, status")
    .eq("email", fixtureEmail)
    .single();
  const { data: room, error: roomError } = await client
    .from("rooms")
    .select("id, room_number, monthly_rate, status")
    .eq("property_id", GRAND_FINA_PROPERTY_ID)
    .eq("status", "available")
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  assert(
    !tenantError &&
      tenant?.status === "pending" &&
      !roomError &&
      room?.status === "available",
    `${role} lease fixtures were not eligible.`,
  );

  const invalidLeaseBase = {
    property_id: GRAND_FINA_PROPERTY_ID,
    tenant_id: tenant.id,
    room_id: room.id,
    status: "active",
    start_date: "2026-07-01",
    end_date: "2026-12-31",
    monthly_rent: room.monthly_rate,
    billing_day: 5,
    notes: "Fictional local Milestone 16 validation lease.",
  };
  const invalidBilling = await client
    .from("leases")
    .insert({ ...invalidLeaseBase, billing_day: 29 });
  const invalidRent = await client
    .from("leases")
    .insert({ ...invalidLeaseBase, monthly_rent: 0 });
  const invalidRange = await client.from("leases").insert({
    ...invalidLeaseBase,
    end_date: "2026-06-30",
  });
  const futureActiveLease = await client.from("leases").insert({
    ...invalidLeaseBase,
    start_date: "2099-01-01",
    end_date: null,
  });
  const crossTenant = await client.from("leases").insert({
    ...invalidLeaseBase,
    tenant_id: CROSS_PROPERTY_TENANT_ID,
  });
  const crossRoom = await client.from("leases").insert({
    ...invalidLeaseBase,
    room_id: CROSS_PROPERTY_ROOM_ID,
  });
  assert(
    Boolean(invalidBilling.error) &&
      Boolean(invalidRent.error) &&
      Boolean(invalidRange.error) &&
      Boolean(futureActiveLease.error) &&
      Boolean(crossTenant.error) &&
      Boolean(crossRoom.error),
    `${role} could bypass lease validation or property boundaries.`,
  );

  const { data: createdLease, error: createError } = await client
    .from("leases")
    .insert(invalidLeaseBase)
    .select(
      "id, tenant_id, room_id, status, monthly_rent, billing_day",
    )
    .single();
  assert(
    !createError &&
      createdLease?.tenant_id === tenant.id &&
      createdLease.room_id === room.id &&
      createdLease.status === "active" &&
      createdLease.monthly_rent === room.monthly_rate,
    `${role} could not create an active lease.`,
  );

  const [{ data: occupiedRoom }, { data: activeTenant }] = await Promise.all([
    client.from("rooms").select("status").eq("id", room.id).single(),
    client.from("tenants").select("status").eq("id", tenant.id).single(),
  ]);
  assert(
    occupiedRoom?.status === "occupied" &&
      activeTenant?.status === "active",
    `${role} lease creation did not synchronize occupancy atomically.`,
  );

  const { data: updatedLease, error: updateError } = await client
    .from("leases")
    .update({
      billing_day: 6,
      monthly_rent: room.monthly_rate + 1000,
      notes: `Fictional ${role} lease update validation.`,
    })
    .eq("id", createdLease.id)
    .select("billing_day, monthly_rent")
    .single();
  assert(
    !updateError &&
      updatedLease?.billing_day === 6 &&
      updatedLease.monthly_rent === room.monthly_rate + 1000,
    `${role} could not update safe lease terms.`,
  );

  const protectedTenantUpdate = await client
    .from("leases")
    .update({ tenant_id: CROSS_PROPERTY_TENANT_ID })
    .eq("id", createdLease.id);
  const protectedRoomUpdate = await client
    .from("leases")
    .update({ room_id: CROSS_PROPERTY_ROOM_ID })
    .eq("id", createdLease.id);
  const protectedStatusUpdate = await client
    .from("leases")
    .update({ status: "ended" })
    .eq("id", createdLease.id);
  const protectedDepositUpdate = await client
    .from("leases")
    .update({ deposit_amount: 1 })
    .eq("id", createdLease.id);
  assert(
    Boolean(protectedTenantUpdate.error) &&
      Boolean(protectedRoomUpdate.error) &&
      Boolean(protectedStatusUpdate.error) &&
      Boolean(protectedDepositUpdate.error),
    `${role} could update immutable lease fields.`,
  );

  const { data: conflictTenant, error: conflictTenantError } = await client
    .from("tenants")
    .insert({
      property_id: GRAND_FINA_PROPERTY_ID,
      full_name: `${role} Lease Conflict Validation`,
      email: conflictEmail,
      status: "pending",
      notes: "Fictional local Milestone 16 conflict fixture.",
    })
    .select("id")
    .single();
  assert(
    !conflictTenantError && conflictTenant,
    `${role} conflict tenant could not be created.`,
  );

  const duplicateRoom = await client.from("leases").insert({
    ...invalidLeaseBase,
    tenant_id: conflictTenant.id,
  });
  const duplicateExact = await client.from("leases").insert(invalidLeaseBase);
  assert(
    Boolean(duplicateRoom.error) && Boolean(duplicateExact.error),
    `${role} could create a conflicting active lease.`,
  );

  if (role === "owner") {
    const { data: alternateRoom, error: alternateRoomError } = await client
      .from("rooms")
      .select("id")
      .eq("property_id", GRAND_FINA_PROPERTY_ID)
      .eq("status", "available")
      .neq("id", room.id)
      .order("sort_order")
      .limit(1)
      .maybeSingle();
    assert(
      !alternateRoomError && alternateRoom,
      "Owner duplicate-tenant fixture did not have an alternate available room.",
    );
    const duplicateTenant = await client.from("leases").insert({
      ...invalidLeaseBase,
      room_id: alternateRoom.id,
    });
    assert(
      Boolean(duplicateTenant.error),
      "Owner could create a second active lease for one tenant.",
    );
  }
}

async function assertInvoiceWritePermissions(client, role) {
  const { data: lease, error: leaseError } = await client
    .from("leases")
    .select(
      "id, property_id, start_date, end_date, monthly_rent, billing_day",
    )
    .eq("property_id", GRAND_FINA_PROPERTY_ID)
    .eq("status", "active")
    .order("start_date")
    .limit(1)
    .single();
  assert(!leaseError && lease, `${role} could not read a billable lease.`);

  if (role === "staff") {
    const staffInsert = await client.from("invoices").insert({
      property_id: GRAND_FINA_PROPERTY_ID,
      lease_id: lease.id,
      billing_period: "2026-10-01",
      issue_date: "2026-09-25",
      due_date: `2026-10-${String(lease.billing_day).padStart(2, "0")}`,
      amount: lease.monthly_rent,
      notes: "Fictional local Milestone 17 validation staff denial.",
    });
    const { data: invoice, error: invoiceError } = await client
      .from("invoices")
      .select("id, notes")
      .eq("property_id", GRAND_FINA_PROPERTY_ID)
      .limit(1)
      .single();
    assert(!invoiceError && invoice, "Staff could not read invoices.");
    const staffUpdate = await client
      .from("invoices")
      .update({ notes: "Staff invoice update denied." })
      .eq("id", invoice.id)
      .select("id");
    assert(
      Boolean(staffInsert.error) &&
        (Boolean(staffUpdate.error) || staffUpdate.data?.length === 0),
      "Staff could create or update an invoice.",
    );
    return;
  }

  const billingMonth = futureBillingPeriod(role === "owner" ? 1 : 2);
  const billingPeriod = `${billingMonth}-01`;
  const dueDate = `${billingMonth}-${String(lease.billing_day).padStart(2, "0")}`;
  const invoiceBase = {
    property_id: GRAND_FINA_PROPERTY_ID,
    lease_id: lease.id,
    billing_period: billingPeriod,
    issue_date: VALIDATION_DATE,
    due_date: dueDate,
    amount: lease.monthly_rent,
    notes: `Fictional local Milestone 17 validation ${role} invoice.`,
  };

  const duplicateSeedInvoice = await client.from("invoices").insert({
    ...invoiceBase,
    billing_period: "2026-07-01",
    issue_date: "2026-06-25",
    due_date: `2026-07-${String(lease.billing_day).padStart(2, "0")}`,
  });
  const invalidPeriod = await client.from("invoices").insert({
    ...invoiceBase,
    billing_period: `${billingMonth}-02`,
  });
  const invalidDueMonth = await client.from("invoices").insert({
    ...invoiceBase,
    due_date: `${futureBillingPeriod(3)}-05`,
  });
  const invalidDateRange = await client.from("invoices").insert({
    ...invoiceBase,
    issue_date: `${futureBillingPeriod(3)}-01`,
  });
  const invalidAmount = await client.from("invoices").insert({
    ...invoiceBase,
    amount: 0,
  });
  const outsideLeasePeriod = await client.from("invoices").insert({
    ...invoiceBase,
    billing_period: "2099-01-01",
    due_date: `2099-01-${String(lease.billing_day).padStart(2, "0")}`,
  });
  const crossPropertyLease = await client.from("invoices").insert({
    ...invoiceBase,
    lease_id: CROSS_PROPERTY_LEASE_ID,
  });
  assert(
    Boolean(duplicateSeedInvoice.error) &&
      Boolean(invalidPeriod.error) &&
      Boolean(invalidDueMonth.error) &&
      Boolean(invalidDateRange.error) &&
      Boolean(invalidAmount.error) &&
      Boolean(outsideLeasePeriod.error) &&
      Boolean(crossPropertyLease.error),
    `${role} could bypass invoice validation, uniqueness, or property scope.`,
  );

  const { data: createdInvoice, error: createError } = await client
    .from("invoices")
    .insert(invoiceBase)
    .select(
      "id, lease_id, reference, billing_period, amount, status, notes",
    )
    .single();
  assert(
    !createError &&
      createdInvoice?.lease_id === lease.id &&
      createdInvoice.billing_period === billingPeriod &&
      createdInvoice.amount === lease.monthly_rent &&
      new RegExp(
        `^GF-INV-${billingMonth.replace("-", "")}-\\d{6}$`,
      ).test(createdInvoice.reference) &&
      ["issued", "overdue"].includes(createdInvoice.status),
    `${role} could not create a valid invoice with a generated reference.`,
  );

  const duplicateInvoice = await client.from("invoices").insert(invoiceBase);
  assert(
    Boolean(duplicateInvoice.error),
    `${role} could create a duplicate lease-period invoice.`,
  );

  const { data: updatedInvoice, error: updateError } = await client
    .from("invoices")
    .update({
      issue_date: VALIDATION_DATE,
      amount: lease.monthly_rent + 1000,
      notes: `Fictional local Milestone 17 validation ${role} update.`,
    })
    .eq("id", createdInvoice.id)
    .select("issue_date, amount, notes")
    .single();
  assert(
    !updateError &&
      updatedInvoice?.issue_date === VALIDATION_DATE &&
      updatedInvoice.amount === lease.monthly_rent + 1000,
    `${role} could not update safe unpaid invoice fields.`,
  );

  const protectedLease = await client
    .from("invoices")
    .update({ lease_id: CROSS_PROPERTY_LEASE_ID })
    .eq("id", createdInvoice.id);
  const protectedPeriod = await client
    .from("invoices")
    .update({ billing_period: `${futureBillingPeriod(4)}-01` })
    .eq("id", createdInvoice.id);
  const protectedStatus = await client
    .from("invoices")
    .update({ status: "paid" })
    .eq("id", createdInvoice.id);
  assert(
    Boolean(protectedLease.error) &&
      Boolean(protectedPeriod.error) &&
      Boolean(protectedStatus.error),
    `${role} could update an immutable invoice field or bypass status derivation.`,
  );

  const { data: payment, error: paymentError } = await client
    .from("payments")
    .select("invoice_id")
    .eq("status", "completed")
    .limit(1)
    .single();
  assert(!paymentError && payment, `${role} could not read payment evidence.`);
  const paymentProtectedAmount = await client
    .from("invoices")
    .update({ amount: 1 })
    .eq("id", payment.invoice_id);
  assert(
    Boolean(paymentProtectedAmount.error),
    `${role} could change an invoice amount after payment evidence exists.`,
  );
}

async function assertPaymentWritePermissions(client, role) {
  if (role === "staff") {
    const { data: invoice, error: invoiceError } = await client
      .from("invoices")
      .select("id")
      .neq("status", "paid")
      .limit(1)
      .single();
    const { data: payment, error: paymentError } = await client
      .from("payments")
      .select("id")
      .limit(1)
      .single();
    assert(
      !invoiceError && invoice && !paymentError && payment,
      "Staff could not read payment prerequisites.",
    );

    const staffInsert = await client.from("payments").insert({
      property_id: GRAND_FINA_PROPERTY_ID,
      invoice_id: invoice.id,
      payment_date: VALIDATION_DATE,
      amount: 1,
      method: "cash",
      notes: "Fictional local Milestone 18 validation staff denial.",
    });
    const staffUpdate = await client
      .from("payments")
      .update({ notes: "Staff payment update denied." })
      .eq("id", payment.id)
      .select("id");
    assert(
      Boolean(staffInsert.error) &&
        (Boolean(staffUpdate.error) || staffUpdate.data?.length === 0),
      "Staff could create or update a payment.",
    );
    return;
  }

  const { data: invoice, error: invoiceError } = await client
    .from("invoices")
    .select("id, lease_id, amount, status")
    .like(
      "notes",
      `Fictional local Milestone 17 validation ${role} update.%`,
    )
    .single();
  assert(
    !invoiceError && invoice,
    `${role} payment validation invoice was not available.`,
  );

  const { data: lease, error: leaseError } = await client
    .from("leases")
    .select("monthly_rent")
    .eq("id", invoice.lease_id)
    .single();
  assert(!leaseError && lease, `${role} payment lease was not readable.`);

  const paymentBase = {
    property_id: GRAND_FINA_PROPERTY_ID,
    invoice_id: invoice.id,
    payment_date: VALIDATION_DATE,
    method: "bank_transfer",
    notes: `Fictional local Milestone 18 validation ${role} payment.`,
  };
  const zeroPayment = await client
    .from("payments")
    .insert({ ...paymentBase, amount: 0 });
  const negativePayment = await client
    .from("payments")
    .insert({ ...paymentBase, amount: -1 });
  const nanPayment = await client
    .from("payments")
    .insert({ ...paymentBase, amount: "NaN" });
  const overpayment = await client
    .from("payments")
    .insert({ ...paymentBase, amount: invoice.amount + 1 });
  const invalidInvoice = await client.from("payments").insert({
    ...paymentBase,
    invoice_id: "ffffffff-ffff-4fff-8fff-fffffffffff9",
    amount: 1,
  });
  const crossPropertyInvoice = await client.from("payments").insert({
    ...paymentBase,
    invoice_id: CROSS_PROPERTY_INVOICE_ID,
    amount: 1,
  });
  assert(
    Boolean(zeroPayment.error) &&
      Boolean(negativePayment.error) &&
      Boolean(nanPayment.error) &&
      Boolean(overpayment.error) &&
      Boolean(invalidInvoice.error) &&
      Boolean(crossPropertyInvoice.error),
    `${role} could bypass payment amount, invoice, or property validation.`,
  );

  const partialAmount = Math.floor(invoice.amount / 3);
  const { data: partialPayment, error: partialError } = await client
    .from("payments")
    .insert({ ...paymentBase, amount: partialAmount })
    .select(
      "id, invoice_id, reference, amount, payment_date, method, status, notes",
    )
    .single();
  assert(
    !partialError &&
      partialPayment?.invoice_id === invoice.id &&
      partialPayment.amount === partialAmount &&
      partialPayment.status === "completed" &&
      new RegExp(
        `^GF-PAY-${VALIDATION_DATE_COMPACT_MONTH}-\\d{6}$`,
      ).test(partialPayment.reference),
    `${role} could not record a valid partial payment.`,
  );

  const { data: partialInvoice, error: partialInvoiceError } = await client
    .from("invoices")
    .select("amount, status")
    .eq("id", invoice.id)
    .single();
  const { data: partialRows, error: partialRowsError } = await client
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoice.id)
    .eq("status", "completed");
  const partialPaid = partialRows?.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  assert(
    !partialInvoiceError &&
      !partialRowsError &&
      partialInvoice?.amount === invoice.amount &&
      partialInvoice.status === "partially_paid" &&
      partialPaid === partialAmount,
    `${role} partial payment did not derive the expected invoice balance and status.`,
  );

  const { data: updatedPayment, error: updateError } = await client
    .from("payments")
    .update({
      notes: `Fictional local Milestone 18 validation ${role} note update.`,
    })
    .eq("id", partialPayment.id)
    .select("notes")
    .single();
  const protectedAmount = await client
    .from("payments")
    .update({ amount: partialAmount + 1 })
    .eq("id", partialPayment.id);
  const protectedInvoice = await client
    .from("payments")
    .update({ invoice_id: CROSS_PROPERTY_INVOICE_ID })
    .eq("id", partialPayment.id);
  const protectedDate = await client
    .from("payments")
    .update({ payment_date: `${futureBillingPeriod(1)}-01` })
    .eq("id", partialPayment.id);
  const protectedMethod = await client
    .from("payments")
    .update({ method: "cash" })
    .eq("id", partialPayment.id);
  const deletePayment = await client
    .from("payments")
    .delete()
    .eq("id", partialPayment.id);
  assert(
    !updateError &&
      updatedPayment?.notes.includes("note update") &&
      Boolean(protectedAmount.error) &&
      Boolean(protectedInvoice.error) &&
      Boolean(protectedDate.error) &&
      Boolean(protectedMethod.error) &&
      Boolean(deletePayment.error),
    `${role} payment metadata permissions or immutable fields were incorrect.`,
  );

  const remainingAmount = invoice.amount - partialAmount;
  const concurrentResults = await Promise.all([
    client
      .from("payments")
      .insert({
        ...paymentBase,
        amount: remainingAmount,
        notes: `Fictional local Milestone 18 validation ${role} concurrent A.`,
      })
      .select("id, reference")
      .single(),
    client
      .from("payments")
      .insert({
        ...paymentBase,
        amount: remainingAmount,
        notes: `Fictional local Milestone 18 validation ${role} concurrent B.`,
      })
      .select("id, reference")
      .single(),
  ]);
  const successfulConcurrent = concurrentResults.filter(
    (result) => !result.error && result.data,
  );
  const rejectedConcurrent = concurrentResults.filter(
    (result) => Boolean(result.error),
  );
  assert(
    successfulConcurrent.length === 1 && rejectedConcurrent.length === 1,
    `${role} concurrent payment submissions were not serialized safely.`,
  );

  const [{ data: paidInvoice }, { data: finalPayments }] =
    await Promise.all([
      client
        .from("invoices")
        .select("amount, status")
        .eq("id", invoice.id)
        .single(),
      client
        .from("payments")
        .select("amount")
        .eq("invoice_id", invoice.id)
        .eq("status", "completed"),
    ]);
  const finalPaid = finalPayments?.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  assert(
    paidInvoice?.amount === invoice.amount &&
      paidInvoice.status === "paid" &&
      finalPaid === invoice.amount,
    `${role} final payment did not derive a paid invoice with zero balance.`,
  );

  const paidInvoicePayment = await client
    .from("payments")
    .insert({ ...paymentBase, amount: 1 });
  const { data: leaseAfterPayment } = await client
    .from("leases")
    .select("monthly_rent")
    .eq("id", invoice.lease_id)
    .single();
  assert(
    Boolean(paidInvoicePayment.error) &&
      leaseAfterPayment?.monthly_rent === lease.monthly_rent,
    `${role} could overpay a paid invoice or alter the lease rent.`,
  );
}

async function assertExpenseWritePermissions(client, role) {
  const { data: existingExpense, error: expenseError } = await client
    .from("expenses")
    .select("id, notes")
    .eq("property_id", GRAND_FINA_PROPERTY_ID)
    .neq("status", "void")
    .limit(1)
    .single();
  assert(!expenseError && existingExpense, `${role} could not read expenses.`);

  if (role === "staff") {
    const staffInsert = await client.from("expenses").insert({
      property_id: GRAND_FINA_PROPERTY_ID,
      expense_date: "2026-07-30",
      category: "supplies",
      description: "Staff expense test",
      amount: 1,
      payment_method: "cash",
      status: "pending",
    });
    const staffUpdate = await client
      .from("expenses")
      .update({ notes: "Staff expense update denied." })
      .eq("id", existingExpense.id)
      .select("id");
    const staffDelete = await client
      .from("expenses")
      .delete()
      .eq("id", existingExpense.id);
    assert(
      Boolean(staffInsert.error) &&
        (Boolean(staffUpdate.error) || staffUpdate.data?.length === 0) &&
        Boolean(staffDelete.error),
      "Staff could create, update, or delete an expense.",
    );
    return;
  }

  const expenseBase = {
    property_id: GRAND_FINA_PROPERTY_ID,
    room_id: ROOM_ONE_ID,
    expense_date: "2026-07-30",
    category: "supplies",
    description: `Fictional local Milestone 20 ${role} expense.`,
    amount: 375000,
    payment_method: "bank_transfer",
    vendor: "Fictional Milestone 20 Vendor",
    status: "pending",
    notes: `Fictional local Milestone 20 validation ${role}.`,
  };
  const invalidAmount = await client
    .from("expenses")
    .insert({ ...expenseBase, amount: 0 });
  const invalidCategory = await client
    .from("expenses")
    .insert({ ...expenseBase, category: "invalid" });
  const invalidMethod = await client
    .from("expenses")
    .insert({ ...expenseBase, payment_method: "invalid" });
  const invalidRoom = await client
    .from("expenses")
    .insert({ ...expenseBase, room_id: CROSS_PROPERTY_ROOM_ID });
  const invalidInitialStatus = await client
    .from("expenses")
    .insert({ ...expenseBase, status: "void" });
  assert(
    Boolean(invalidAmount.error) &&
      Boolean(invalidCategory.error) &&
      Boolean(invalidMethod.error) &&
      Boolean(invalidRoom.error) &&
      Boolean(invalidInitialStatus.error),
    `${role} could bypass expense validation or property boundaries.`,
  );

  const { data: createdExpense, error: createError } = await client
    .from("expenses")
    .insert(expenseBase)
    .select(
      "id, reference, room_id, expense_date, category, amount, status, notes",
    )
    .single();
  assert(
    !createError &&
      createdExpense?.room_id === ROOM_ONE_ID &&
      createdExpense.amount === expenseBase.amount &&
      createdExpense.status === "pending" &&
      /^GF-EXP-202607-\d{6}$/.test(createdExpense.reference),
    `${role} could not create a valid pending expense.`,
  );

  const { data: updatedExpense, error: updateError } = await client
    .from("expenses")
    .update({
      description: `Fictional local Milestone 20 ${role} updated expense.`,
      amount: 425000,
      status: "recorded",
      notes: `Fictional local Milestone 20 validation ${role} recorded.`,
    })
    .eq("id", createdExpense.id)
    .select("amount, status, notes")
    .single();
  assert(
    !updateError &&
      updatedExpense?.amount === 425000 &&
      updatedExpense.status === "recorded",
    `${role} could not update and record a pending expense.`,
  );

  const protectedAmount = await client
    .from("expenses")
    .update({ amount: 500000 })
    .eq("id", createdExpense.id);
  const protectedProperty = await client
    .from("expenses")
    .update({ property_id: "ffffffff-ffff-4fff-8fff-ffffffffffff" })
    .eq("id", createdExpense.id);
  const { data: noteUpdated, error: noteError } = await client
    .from("expenses")
    .update({ notes: `Fictional ${role} recorded note update.` })
    .eq("id", createdExpense.id)
    .select("notes")
    .single();
  assert(
    Boolean(protectedAmount.error) &&
      Boolean(protectedProperty.error) &&
      !noteError &&
      noteUpdated?.notes.includes("recorded note update"),
    `${role} could alter protected recorded-expense fields or could not update notes.`,
  );

  const missingReason = await client
    .from("expenses")
    .update({ status: "void" })
    .eq("id", createdExpense.id);
  const { data: voidedExpense, error: voidError } = await client
    .from("expenses")
    .update({
      status: "void",
      void_reason: `Fictional ${role} Milestone 20 correction.`,
    })
    .eq("id", createdExpense.id)
    .select("status, void_reason, voided_at, voided_by")
    .single();
  assert(
    Boolean(missingReason.error) &&
      !voidError &&
      voidedExpense?.status === "void" &&
      Boolean(voidedExpense.voided_at) &&
      Boolean(voidedExpense.voided_by),
    `${role} expense void did not retain complete audit metadata.`,
  );

  const updateVoided = await client
    .from("expenses")
    .update({ notes: "Void expense mutation denied." })
    .eq("id", createdExpense.id);
  const deleteVoided = await client
    .from("expenses")
    .delete()
    .eq("id", createdExpense.id);
  assert(
    Boolean(updateVoided.error) && Boolean(deleteVoided.error),
    `${role} could mutate or hard-delete a void expense.`,
  );
}

async function assertMaintenanceWritePermissions(client, role) {
  const { data: existingMaintenance, error: maintenanceError } =
    await client
      .from("maintenance_records")
      .select("id, status")
      .eq("property_id", GRAND_FINA_PROPERTY_ID)
      .eq("status", "open")
      .limit(1)
      .single();
  assert(
    !maintenanceError && existingMaintenance,
    `${role} could not read maintenance records.`,
  );

  if (role === "staff") {
    const staffInsert = await client.from("maintenance_records").insert({
      property_id: GRAND_FINA_PROPERTY_ID,
      reported_date: "2026-07-30",
      category: "plumbing",
      title: "Staff maintenance test",
      description: "Fictional staff maintenance validation.",
      priority: "medium",
      status: "open",
    });
    const staffUpdate = await client
      .from("maintenance_records")
      .update({ notes: "Staff maintenance update denied." })
      .eq("id", existingMaintenance.id)
      .select("id");
    const staffDelete = await client
      .from("maintenance_records")
      .delete()
      .eq("id", existingMaintenance.id);
    assert(
      Boolean(staffInsert.error) &&
        (Boolean(staffUpdate.error) || staffUpdate.data?.length === 0) &&
        Boolean(staffDelete.error),
      "Staff could create, update, or delete maintenance.",
    );
    return;
  }

  const [
    { data: expensesBefore, error: expensesBeforeError },
    { data: roomsBefore, error: roomsBeforeError },
  ] = await Promise.all([
    client
      .from("expenses")
      .select("id, amount, status")
      .eq("property_id", GRAND_FINA_PROPERTY_ID)
      .order("id"),
    client
      .from("rooms")
      .select("id, room_number, status")
      .eq("property_id", GRAND_FINA_PROPERTY_ID)
      .order("sort_order")
      .limit(3),
  ]);
  assert(
    !expensesBeforeError &&
      !roomsBeforeError &&
      roomsBefore?.length === 3,
    `${role} could not read maintenance side-effect baselines.`,
  );
  const expenseSignatureBefore = JSON.stringify(expensesBefore);
  const roomSignatureBefore = JSON.stringify(roomsBefore);
  const baselineRoomIds = roomsBefore.map((room) => room.id);
  const maintenanceBase = {
    property_id: GRAND_FINA_PROPERTY_ID,
    room_id: role === "owner" ? baselineRoomIds[0] : null,
    reported_date: "2026-07-30",
    category: "plumbing",
    title: `Fictional Milestone 21 ${role} issue`,
    description: `Fictional local maintenance lifecycle validation for ${role}.`,
    priority: "medium",
    status: "open",
    vendor: "Fictional Milestone 21 Provider",
    scheduled_date: "2026-07-31",
    estimated_cost: 450000,
    notes: "Fictional local validation record.",
  };
  const invalidCategory = await client
    .from("maintenance_records")
    .insert({ ...maintenanceBase, category: "invalid" });
  const invalidPriority = await client
    .from("maintenance_records")
    .insert({ ...maintenanceBase, priority: "invalid" });
  const invalidStatus = await client
    .from("maintenance_records")
    .insert({ ...maintenanceBase, status: "completed" });
  const invalidCost = await client
    .from("maintenance_records")
    .insert({ ...maintenanceBase, estimated_cost: -1 });
  const invalidSchedule = await client
    .from("maintenance_records")
    .insert({ ...maintenanceBase, scheduled_date: "2026-07-29" });
  const invalidRoom = await client
    .from("maintenance_records")
    .insert({ ...maintenanceBase, room_id: CROSS_PROPERTY_ROOM_ID });
  assert(
    Boolean(invalidCategory.error) &&
      Boolean(invalidPriority.error) &&
      Boolean(invalidStatus.error) &&
      Boolean(invalidCost.error) &&
      Boolean(invalidSchedule.error) &&
      Boolean(invalidRoom.error),
    `${role} could bypass maintenance validation or property boundaries.`,
  );

  const { data: createdMaintenance, error: createError } = await client
    .from("maintenance_records")
    .insert(maintenanceBase)
    .select(
      "id, reference, room_id, priority, status, scheduled_date, estimated_cost",
    )
    .single();
  assert(
    !createError &&
      createdMaintenance?.room_id === maintenanceBase.room_id &&
      createdMaintenance.status === "open" &&
      createdMaintenance.estimated_cost === 450000 &&
      /^GF-MNT-202607-\d{6}$/.test(createdMaintenance.reference),
    `${role} could not create valid maintenance.`,
  );

  const { data: progressed, error: progressError } = await client
    .from("maintenance_records")
    .update({
      priority: "high",
      status: "in_progress",
      notes: `Fictional ${role} maintenance work started.`,
    })
    .eq("id", createdMaintenance.id)
    .select("priority, status")
    .single();
  assert(
    !progressError &&
      progressed?.priority === "high" &&
      progressed.status === "in_progress",
    `${role} could not progress maintenance.`,
  );

  const invalidRegression = await client
    .from("maintenance_records")
    .update({ status: "open" })
    .eq("id", createdMaintenance.id);
  const invalidCompletion = await client
    .from("maintenance_records")
    .update({ status: "completed" })
    .eq("id", createdMaintenance.id);
  const prematureActualCost = await client
    .from("maintenance_records")
    .update({ actual_cost: 425000 })
    .eq("id", createdMaintenance.id);
  assert(
    Boolean(invalidRegression.error) &&
      Boolean(invalidCompletion.error) &&
      Boolean(prematureActualCost.error),
    `${role} could bypass maintenance lifecycle validation.`,
  );

  const { data: completed, error: completionError } = await client
    .from("maintenance_records")
    .update({
      status: "completed",
      completed_date: "2026-07-31",
      actual_cost: 425000,
      resolution: "Fictional repair completed and verified.",
      notes: `Fictional ${role} completion record.`,
    })
    .eq("id", createdMaintenance.id)
    .select("status, completed_date, actual_cost, resolution")
    .single();
  assert(
    !completionError &&
      completed?.status === "completed" &&
      completed.completed_date === "2026-07-31" &&
      completed.actual_cost === 425000 &&
      Boolean(completed.resolution),
    `${role} could not complete maintenance.`,
  );

  const terminalUpdate = await client
    .from("maintenance_records")
    .update({ notes: "Terminal mutation denied." })
    .eq("id", createdMaintenance.id);
  const terminalDelete = await client
    .from("maintenance_records")
    .delete()
    .eq("id", createdMaintenance.id);
  assert(
    Boolean(terminalUpdate.error) && Boolean(terminalDelete.error),
    `${role} could mutate or delete completed maintenance.`,
  );

  const { data: cancellationRecord, error: cancellationCreateError } =
    await client
      .from("maintenance_records")
      .insert({
        ...maintenanceBase,
        title: `Fictional Milestone 21 ${role} cancellation`,
        room_id: null,
      })
      .select("id")
      .single();
  const cancellationWithoutNote = await client
    .from("maintenance_records")
    .update({ status: "cancelled", notes: null })
    .eq("id", cancellationRecord?.id);
  const { data: cancelled, error: cancellationError } = await client
    .from("maintenance_records")
    .update({
      status: "cancelled",
      notes: `Fictional ${role} cancellation reason.`,
    })
    .eq("id", cancellationRecord?.id)
    .select("status, room_id")
    .single();
  assert(
    !cancellationCreateError &&
      Boolean(cancellationWithoutNote.error) &&
      !cancellationError &&
      cancelled?.status === "cancelled" &&
      cancelled.room_id === null,
    `${role} cancellation or property-wide maintenance failed.`,
  );

  const [
    { data: roomsAfter, error: roomsAfterError },
    { data: expensesAfter, error: expensesAfterError },
  ] = await Promise.all([
    client
      .from("rooms")
      .select("id, room_number, status")
      .in("id", baselineRoomIds)
      .order("sort_order"),
    client
      .from("expenses")
      .select("id, amount, status")
      .eq("property_id", GRAND_FINA_PROPERTY_ID)
      .order("id"),
  ]);
  assert(
    !roomsAfterError && !expensesAfterError,
    `${role} could not reconcile maintenance side effects.`,
  );
  assert(
    JSON.stringify(roomsAfter) === roomSignatureBefore,
    `${role} maintenance writes altered canonical room status.`,
  );
  assert(
    JSON.stringify(expensesAfter) === expenseSignatureBefore,
    `${role} maintenance writes altered expense records.`,
  );
}

async function assertRoomWritePermissions(client, role) {
  const fakeRoom = {
    id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    property_id: GRAND_FINA_PROPERTY_ID,
    room_number: "AUTH-TEST",
    location: "Local validation",
    floor: null,
    monthly_rate: 1,
    status: "available",
    sort_order: 9999,
  };
  const { data: originalRoom, error: roomError } = await client
    .from("rooms")
    .select("id, room_number, location, floor, monthly_rate, status")
    .eq("id", ROOM_ONE_ID)
    .single();
  assert(!roomError && originalRoom, "Room 1 was not readable for write tests.");

  const insertResult = await client.from("rooms").insert(fakeRoom);
  const deleteResult = await client.from("rooms").delete().eq("id", fakeRoom.id);
  assert(
    Boolean(insertResult.error) && Boolean(deleteResult.error),
    `${role} could insert or delete rooms.`,
  );

  const statusUpdate = await client
    .from("rooms")
    .update({ status: "available" })
    .eq("id", ROOM_ONE_ID);
  const roomNumberUpdate = await client
    .from("rooms")
    .update({ room_number: "AUTH-TEST" })
    .eq("id", ROOM_ONE_ID);
  assert(
    Boolean(statusUpdate.error) && Boolean(roomNumberUpdate.error),
    `${role} could update a protected room field.`,
  );

  if (role === "staff") {
    const staffUpdate = await client
      .from("rooms")
      .update({ monthly_rate: originalRoom.monthly_rate + 1000 })
      .eq("id", ROOM_ONE_ID)
      .select("id");
    assert(
      Boolean(staffUpdate.error) || staffUpdate.data?.length === 0,
      "Staff could update room configuration.",
    );
    return;
  }

  const invalidCombination = await client
    .from("rooms")
    .update({ location: "South Wing", floor: 1 })
    .eq("id", ROOM_ONE_ID);
  assert(
    Boolean(invalidCombination.error),
    `${role} could persist an invalid room location/floor combination.`,
  );

  const temporaryRate = originalRoom.monthly_rate + 1000;
  try {
    const { data: updatedRoom, error: updateError } = await client
      .from("rooms")
      .update({ monthly_rate: temporaryRate })
      .eq("id", ROOM_ONE_ID)
      .select("monthly_rate")
      .single();
    assert(
      !updateError && updatedRoom?.monthly_rate === temporaryRate,
      `${role} could not update an allowed room field.`,
    );
  } finally {
    const { error: restoreError } = await client
      .from("rooms")
      .update({
        monthly_rate: originalRoom.monthly_rate,
        location: originalRoom.location,
        floor: originalRoom.floor,
      })
      .eq("id", ROOM_ONE_ID);
    assert(!restoreError, `${role} room test mutation was not restored.`);
  }
}

async function assertNonmemberIsolation(configuration) {
  const { client, user } = await signIn(
    configuration,
    "portfolio-nonmember@example.com",
  );
  const { data: profiles, error: profileError } = await client
    .from("profiles")
    .select("id");
  assert(
    !profileError && profiles?.length === 1 && profiles[0].id === user.id,
    "The non-member could not read its own profile.",
  );

  const { data: memberships, error: membershipError } = await client
    .from("property_members")
    .select("profile_id");
  assert(
    !membershipError && memberships?.length === 0,
    "The non-member could read a property membership.",
  );

  for (const table of PROPERTY_TABLES) {
    const { data, error } = await client.from(table).select("id").limit(1);
    assert(
      !error && data?.length === 0,
      `The non-member could read ${table}.`,
    );
  }

  const nonmemberUpdate = await client
    .from("rooms")
    .update({ monthly_rate: 1701000 })
    .eq("id", ROOM_ONE_ID)
    .select("id");
  assert(
    Boolean(nonmemberUpdate.error) || nonmemberUpdate.data?.length === 0,
    "The non-member could update the fictional property room configuration.",
  );
  const nonmemberTenantInsert = await client.from("tenants").insert({
    property_id: GRAND_FINA_PROPERTY_ID,
    full_name: "Nonmember Tenant Test",
    status: "pending",
  });
  assert(
    Boolean(nonmemberTenantInsert.error),
    "The non-member could create a fictional property tenant.",
  );
  const nonmemberLeaseInsert = await client.from("leases").insert({
    property_id: GRAND_FINA_PROPERTY_ID,
    tenant_id: "ffffffff-ffff-4fff-8fff-fffffffffff1",
    room_id: ROOM_ONE_ID,
    status: "active",
    start_date: "2026-07-01",
    monthly_rent: 2135000,
    billing_day: 1,
  });
  assert(
    Boolean(nonmemberLeaseInsert.error),
    "The non-member could create a fictional property lease.",
  );
  const nonmemberInvoiceInsert = await client.from("invoices").insert({
    property_id: GRAND_FINA_PROPERTY_ID,
    lease_id: CROSS_PROPERTY_LEASE_ID,
    billing_period: "2026-08-01",
    issue_date: "2026-07-29",
    due_date: "2026-08-05",
    amount: 2135000,
  });
  assert(
    Boolean(nonmemberInvoiceInsert.error),
    "The non-member could create a fictional property invoice.",
  );
  const nonmemberPaymentInsert = await client.from("payments").insert({
    property_id: GRAND_FINA_PROPERTY_ID,
    invoice_id: CROSS_PROPERTY_INVOICE_ID,
    payment_date: "2026-07-29",
    amount: 1,
    method: "cash",
    notes: "Fictional local Milestone 18 validation non-member denial.",
  });
  assert(
    Boolean(nonmemberPaymentInsert.error),
    "The non-member could record a fictional property payment.",
  );
  const nonmemberExpenseInsert = await client.from("expenses").insert({
    property_id: GRAND_FINA_PROPERTY_ID,
    expense_date: "2026-07-30",
    category: "supplies",
    description: "Non-member expense test",
    amount: 1,
    payment_method: "cash",
    status: "pending",
  });
  assert(
    Boolean(nonmemberExpenseInsert.error),
    "The non-member could record a fictional property expense.",
  );
  const nonmemberMaintenanceInsert = await client
    .from("maintenance_records")
    .insert({
      property_id: GRAND_FINA_PROPERTY_ID,
      reported_date: "2026-07-30",
      category: "plumbing",
      title: "Non-member maintenance test",
      description: "Fictional non-member maintenance validation.",
      priority: "medium",
      status: "open",
    });
  assert(
    Boolean(nonmemberMaintenanceInsert.error),
    "The non-member could create fictional property maintenance.",
  );

  await client.auth.signOut();
  console.log("PASS authenticated non-member isolation");
}

async function assertPublicSignupDisabled(configuration) {
  const client = createLocalClient(
    configuration.url,
    configuration.publishableKey,
  );
  const { data, error } = await client.auth.signUp({
    email: "registration-disabled@example.com",
    password: configuration.password,
  });

  assert(Boolean(error) && !data.user, "Public registration was not disabled.");
  console.log("PASS public registration disabled");
}

const configuration = requireLocalConfiguration();
let validationError;

try {
  await assertAnonymousIsolation(configuration);
  for (const identity of MEMBER_IDENTITIES) {
    await assertMemberAccess(configuration, identity);
  }
  await assertNonmemberIsolation(configuration);
  await assertPublicSignupDisabled(configuration);
} catch (error) {
  validationError = error;
}

let cleanupError;
try {
  cleanupLocalDomainFixtures();
} catch (error) {
  cleanupError = error;
}

if (validationError && cleanupError) {
  throw new AggregateError(
    [validationError, cleanupError],
    "Authorization validation failed and local fixtures could not be restored.",
  );
}
if (validationError) {
  throw validationError;
}
if (cleanupError) {
  throw cleanupError;
}
