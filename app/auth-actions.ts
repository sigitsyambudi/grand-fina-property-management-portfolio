"use server";

import { redirect } from "next/navigation";
import { createServerActionSupabaseClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createServerActionSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
