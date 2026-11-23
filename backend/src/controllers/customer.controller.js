
import { z } from "zod";

import { getCustomerRetention } from "../services/retention.service.js";

import {
  getCustomers,
  getCustomerById,
  getCustomerTransactions,
} from "../services/customer.service.js";

const uuidSchema = z.string().uuid();

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

/**
 * Resolve only the business ID verified by
 * requireBusinessAccess middleware.
 */
function getAuthorizedBusinessId(req) {
  if (!req.user?.id || !req.business?.id) {
    return null;
  }

  return req.business.id;
}

/**
 * GET /api/customers
 *
 * Business-scoped customer listing.
 */
export async function listCustomers(req, res, next) {
  try {
    const businessId = getAuthorizedBusinessId(req);

    if (!businessId) {
      return res.status(403).json({
        success: false,
        message: "Business authorization required",
      });
    }

    const querySchema = paginationSchema.extend({
      businessId: uuidSchema,
      search: z.string().max(100).default(""),
    });

    const parsed = querySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
      });
    }

    const result = await getCustomers({
      ...parsed.data,
      businessId,
    });

    return res.status(200).json({
      success: true,
      data: result.customers,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/customers/:id
 *
 * Prevents cross-business customer access.
 */
export async function getCustomer(req, res, next) {
  try {
    const businessId = getAuthorizedBusinessId(req);

    if (!businessId) {
      return res.status(403).json({
        success: false,
        message: "Business authorization required",
      });
    }

    const parsed = uuidSchema.safeParse(req.params.id);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

  const customer = await getCustomerById(
  parsed.data,
  businessId
);

    if (
      !customer ||
      typeof customer.business_id !== "string" ||
      customer.business_id.toLowerCase() !==
      businessId.toLowerCase()
    ) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/customers/:id/transactions
 *
 * Confirms customer ownership before returning
 * transaction history.
 */
export async function listCustomerTransactions(
  req,
  res,
  next
) {
  try {
    const businessId = getAuthorizedBusinessId(req);

    if (!businessId) {
      return res.status(403).json({
        success: false,
        message: "Business authorization required",
      });
    }

    const id = uuidSchema.safeParse(req.params.id);

    const querySchema = paginationSchema.extend({
      businessId: uuidSchema,
    });

    const pagination = querySchema.safeParse(req.query);

    if (!id.success || !pagination.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID or query parameters",
      });
    }

const customer = await getCustomerById(
  parsed.data,
  businessId
);

    if (
      !customer ||
      typeof customer.business_id !== "string" ||
      customer.business_id.toLowerCase() !==
      businessId.toLowerCase()
    ) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const result = await getCustomerTransactions(
      id.data,
      businessId,
      {
        page: pagination.data.page,
        limit: pagination.data.limit,
      }
    );

    return res.status(200).json({
      success: true,
      data: result.transactions,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/customers/retention/analysis
 *
 * Uses the authorized business context.
 */
export async function getRetentionAnalysis(
  req,
  res,
  next
) {
  try {
    const businessId = getAuthorizedBusinessId(req);

    if (!businessId) {
      return res.status(403).json({
        success: false,
        message: "Business authorization required",
      });
    }

    const analysis = await getCustomerRetention(
      businessId
    );

    return res.status(200).json({
      success: true,
      message: "Customer retention analysis completed",
      data: analysis,
    });
  } catch (error) {
    if (error.message === "Business not found") {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    next(error);
  }
}
