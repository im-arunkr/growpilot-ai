
import { supabase } from "../config/supabase.js";

/**
 * GrowPilot AI — Business Authorization Middleware
 *
 * Must run AFTER requireAuth.
 *
 * Verifies:
 * 1. User is authenticated.
 * 2. A valid businessId is provided.
 * 3. User has an active business membership.
 *
 * Never trust a businessId without checking membership.
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function requireBusinessAccess(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Support businessId from request body, query or URL.
    // Reject conflicting business IDs.
    const candidates = [
      req.params?.businessId,
      req.query?.businessId,
      req.body?.businessId,
    ].filter((value) => value !== undefined);

    if (
      candidates.length === 0 ||
      candidates.some(
        (value) =>
          typeof value !== "string" ||
          !UUID_REGEX.test(value)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid businessId is required",
      });
    }

    const businessId = candidates[0];

    if (
      candidates.some(
        (value) =>
          value.toLowerCase() !== businessId.toLowerCase()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Conflicting businessId values",
      });
    }

    const { data: membership, error } = await supabase
      .from("business_memberships")
      .select("business_id, role, status")
      .eq("user_id", req.user.id)
      .eq("business_id", businessId)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      return next(error);
    }

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this business",
      });
    }

    req.business = {
      id: membership.business_id,
      role: membership.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}
