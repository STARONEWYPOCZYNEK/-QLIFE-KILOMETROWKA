import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Klient z rolą serwisową — omija RLS. Tylko po stronie serwera
 * (cron, generowanie raportów, operacje niezwiązane z sesją usera).
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
