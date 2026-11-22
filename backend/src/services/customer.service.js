
import { supabase } from "../config/supabase.js";

export async function getCustomers({
  businessId,
  page = 1,
  limit = 10,
  search = "",
}) {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  let query = supabase
    .from("customers")
    .select(
      "id, business_id, external_reference, full_name, preferred_channel, marketing_consent, created_at",
      { count: "exact" }
    )
    .eq("business_id", businessId);

  if (search) {
    query = query.ilike("full_name", `%${search}%`);
  }

  const { data, count, error } = await query
    .order("full_name", { ascending: true })
    .order("id", { ascending: true })
    .range(start, end);

  if (error) throw error;

  return {
    customers: data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  };
}

export async function getCustomerById(id) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function getCustomerTransactions(
  customerId,
  { page = 1, limit = 20 }
) {
  const start = (page - 1) * limit;

  const { data, count, error } = await supabase
    .from("transactions")
    .select(
      "id, service_type, amount, fee_revenue, status, occurred_at",
      { count: "exact" }
    )
    .eq("customer_id", customerId)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: true })
    .range(start, start + limit - 1);

  if (error) throw error;

  return {
    transactions: data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  };
}
