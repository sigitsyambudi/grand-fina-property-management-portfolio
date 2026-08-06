import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ACCESS_ROLES } from "./constants";
import type {
  AccessRole,
  AuthorizedPropertyAccess,
  PropertyAccess,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAccessRole(value: unknown): value is AccessRole {
  return (
    typeof value === "string" &&
    ACCESS_ROLES.some((role) => role === value)
  );
}

function readProfile(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.display_name !== "string" ||
    value.display_name.trim() === "" ||
    !isAccessRole(value.role)
  ) {
    return null;
  }

  return {
    displayName: value.display_name.trim(),
    role: value.role,
  };
}

function readMembership(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.property_id !== "string" ||
    !isAccessRole(value.role)
  ) {
    return null;
  }

  return {
    propertyId: value.property_id,
    role: value.role,
  };
}

function readProperty(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.timezone !== "string" ||
    typeof value.currency_code !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    timezone: value.timezone,
    currencyCode: value.currency_code,
  };
}

export async function getPropertyAccess(): Promise<PropertyAccess> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: "unauthenticated" };
  }

  const [profileResult, membershipResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("property_members")
      .select("property_id, role")
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);

  if (profileResult.error || membershipResult.error) {
    return { status: "unauthorized", reason: "lookup-failed" };
  }

  const profile = readProfile(profileResult.data as unknown);
  if (!profile) {
    return { status: "unauthorized", reason: "profile-missing" };
  }

  const membership = readMembership(membershipResult.data as unknown);
  if (!membership) {
    return { status: "unauthorized", reason: "membership-missing" };
  }

  if (profile.role !== membership.role) {
    return { status: "unauthorized", reason: "role-mismatch" };
  }

  const propertyResult = await supabase
    .from("properties")
    .select("id, name, timezone, currency_code")
    .eq("id", membership.propertyId)
    .maybeSingle();

  if (propertyResult.error) {
    return { status: "unauthorized", reason: "lookup-failed" };
  }

  const property = readProperty(propertyResult.data as unknown);
  if (!property) {
    return { status: "unauthorized", reason: "property-unavailable" };
  }

  return {
    status: "authorized",
    userId: user.id,
    displayName: profile.displayName,
    role: membership.role,
    property,
  };
}

export function hasRole(
  access: AuthorizedPropertyAccess,
  allowedRoles: readonly AccessRole[],
): boolean {
  return allowedRoles.includes(access.role);
}

export function canAccessProperty(
  access: AuthorizedPropertyAccess,
  propertyId: string,
): boolean {
  return access.property.id === propertyId;
}
