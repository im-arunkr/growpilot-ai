
import { z } from "zod";
import { getCustomerRetention } from "../services/retention.service.js";
import {
  getCustomers,
  getCustomerById,
  getCustomerTransactions,
} from "../services/customer.service.js";

const uuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid UUID format"
);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export async function listCustomers(req, res, next) {
  try {
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

    const result = await getCustomers(parsed.data);

    res.status(200).json({
      success: true,
      data: result.customers,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomer(req, res, next) {
  try {
    const parsed = uuidSchema.safeParse(req.params.id);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await getCustomerById(parsed.data);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}

export async function listCustomerTransactions(req, res, next) {
  try {
    const id = uuidSchema.safeParse(req.params.id);
    const pagination = paginationSchema.safeParse(req.query);

    if (!id.success || !pagination.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID or pagination",
      });
    }

    const customer = await getCustomerById(id.data);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const result = await getCustomerTransactions(
      id.data,
      pagination.data
    );

    res.status(200).json({
      success: true,
      data: result.transactions,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRetentionAnalysis(req, res, next) {
  try {
    const parsed = uuidSchema.safeParse(req.query.businessId);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Valid businessId is required",
      });
    }

    const analysis = await getCustomerRetention(parsed.data);

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
