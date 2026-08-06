import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginPresentation } from "@/components/auth/login-presentation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return <LoginPresentation />;
}
