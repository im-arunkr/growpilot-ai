
import { supabase } from "../config/supabase.js";

/**
 * Get customers belonging to an authorized business.
 */
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
    customers: data ?? [],
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  };
}

/**
 * Fetch customer only when it belongs to the
 * authorized business.
 *
 * Requires BOTH customerId and businessId.
 */
export async function getCustomerById(
  customerId,
  businessId
) {
  if (!customerId || !businessId) {
    throw new Error(
      "Customer ID and business ID are required"
    );
  }

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

/**
 * Fetch transactions only for the specified
 * customer within the authorized business.
 *
 * The businessId filter prevents cross-business
 * transaction access.
 */
export async function getCustomerTransactions(
  customerId,
  businessId,
  { page = 1, limit = 20 } = {}
) {
  if (!customerId || !businessId) {
    throw new Error(
      "Customer ID and business ID are required"
    );
  }

  const start = (page - 1) * limit;

  const { data, count, error } = await supabase
    .from("transactions")
    .select(
      "id, service_type, amount, fee_revenue, status, occurred_at",
      { count: "exact" }
    )
    .eq("customer_id", customerId)
    .eq("business_id", businessId)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: true })
    .range(start, start + limit - 1);

  if (error) throw error;

  return {
    transactions: data ?? [],
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  };
}
