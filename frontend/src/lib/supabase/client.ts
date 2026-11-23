
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase authentication environment variables"
  );
}

/**
 * GrowPilot AI — Frontend Supabase Auth Client
 *
 * Uses the public Supabase key.
 * Never expose the service-role key in frontend code.
 */
export const supabaseAuth = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
