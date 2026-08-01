"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function friendlySendError(status: number | undefined): string {
  if (status === 429) {
    return "Zbyt wiele prób logowania w krótkim czasie. Spróbuj ponownie za około godzinę.";
  }
  return "Nie udało się wysłać kodu logowania. Spróbuj ponownie.";
}

export async function sendLoginCode(email: string): Promise<{ error?: string; sent?: boolean }> {
  if (!email || !email.includes("@")) {
    return { error: "Podaj poprawny adres e-mail" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });

  if (error) {
    return { error: friendlySendError(error.status) };
  }

  return { sent: true };
}

export async function verifyLoginCode(
  email: string,
  code: string,
): Promise<{ error: string } | never> {
  if (!/^\d{6,8}$/.test(code)) {
    return { error: "Kod musi mieć od 6 do 8 cyfr" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });

  if (error) {
    return { error: "Nieprawidłowy lub wygasły kod. Poproś o nowy." };
  }

  redirect("/panel");
}
