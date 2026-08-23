import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Use service role key for server-side privileged operations
  // This key must NEVER be exposed to the browser
  const apiKey = supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !apiKey) {
    throw new Error(
      "Supabase environment variables are not configured. " +
      "Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  return createClient(supabaseUrl, apiKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
