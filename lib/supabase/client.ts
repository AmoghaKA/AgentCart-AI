import { createClient } from "@supabase/supabase-js";

let client: any = null;

export function getSupabaseBrowserClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "Supabase environment variables are not configured. " +
      "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}
