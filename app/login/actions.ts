"use server";

import { redirect } from "next/navigation";
import { createServerActionSupabaseClient } from "@/lib/supabase/server";

export type LoginState = {
  error: "invalid-input" | "invalid-credentials" | "unexpected" | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signInAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");

  if (typeof rawEmail !== "string" || typeof rawPassword !== "string") {
    return { error: "invalid-input" };
  }

  const email = rawEmail.trim().toLowerCase();
  if (
    email.length > 254 ||
    !EMAIL_PATTERN.test(email) ||
    rawPassword.length < 6 ||
    rawPassword.length > 128
  ) {
    return { error: "invalid-input" };
  }

  const supabase = await createServerActionSupabaseClient();

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: rawPassword,
    });

    if (error) {
      return {
        error:
          error.code === "invalid_credentials"
            ? "invalid-credentials"
            : "unexpected",
      };
    }
  } catch {
    return { error: "unexpected" };
  }

  redirect("/");
}
