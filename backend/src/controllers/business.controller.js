
import {
  getBusinesses,
  getBusinessById,
} from "../services/business.service.js";

import { z } from "zod";

const uuidSchema = z.uuid();

export async function listBusinesses(req, res, next) {
  try {
    const businesses = await getBusinesses();

    res.status(200).json({
      success: true,
      count: businesses.length,
      data: businesses,
    });
  } catch (error) {
    next(error);
  }
}

export async function getBusiness(req, res, next) {
  try {
    const parsed = uuidSchema.safeParse(req.params.id);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid business ID",
      });
    }

    const business = await getBusinessById(parsed.data);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    res.status(200).json({
      success: true,
      data: business,
    });
  } catch (error) {
    next(error);
  }
}
