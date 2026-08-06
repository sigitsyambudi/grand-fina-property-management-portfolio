import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicSupabaseEnvironment } from "./env";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getPublicSupabaseEnvironment();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
    },
  });
}

export async function createServerActionSupabaseClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getPublicSupabaseEnvironment();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
