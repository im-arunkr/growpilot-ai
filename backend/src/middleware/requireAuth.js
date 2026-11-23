
import { supabase } from "../config/supabase.js";

/**
 * GrowPilot AI — Authentication Middleware
 *
 * Verifies the Supabase access token.
 *
 * This middleware checks user identity only.
 * Business-level authorization is handled separately.
 */
export async function requireAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (
      typeof authorization !== "string" ||
      !authorization.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    const { data, error } =
      await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email ?? null,
      role: data.user.role ?? "authenticated",
    };

    next();
  } catch (error) {
    next(error);
  }
}
