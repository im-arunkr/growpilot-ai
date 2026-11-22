
import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

export async function checkDatabaseConnection() {
  const { count, error } = await supabase
    .from("businesses")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  }

  return {
    connected: true,
    businessCount: count ?? 0,
  };
}
