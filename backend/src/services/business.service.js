
import { supabase } from "../config/supabase.js";

export async function getBusinesses() {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, owner_name, business_type, currency_code, timezone, description, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

export async function getBusinessById(id) {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data;
}
