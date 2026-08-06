"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicSupabaseEnvironment } from "./env";

export function createBrowserSupabaseClient() {
  const { url, publishableKey } = getPublicSupabaseEnvironment();

  return createBrowserClient(url, publishableKey);
}
