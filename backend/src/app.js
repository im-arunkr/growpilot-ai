
import express from "express";
import cors from "cors";

import { checkDatabaseConnection } from "./config/supabase.js";
import { env } from "./config/env.js";

// API Routes
import businessRoutes from "./routes/business.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import agentRoutes from "./routes/agent.routes.js";
import approvalRoutes from "./routes/approval.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

// Authentication Middleware
import { requireAuth } from "./middleware/requireAuth.js";

const app = express();

// ======================================================
// 1. GLOBAL MIDDLEWARE
// ======================================================

// Allow configured frontend origin.
app.use(
  cors({
    origin:
      env.NODE_ENV === "development"
        ? ["http://localhost:3000"]
        : [],
  })
);

// Parse incoming JSON requests.
app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
  })
);

// ======================================================
// 2. PUBLIC HEALTH CHECK
// ======================================================

// This endpoint does not require authentication.
app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "GrowPilot AI Backend is running",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// ======================================================
// 3. DEVELOPMENT DATABASE DIAGNOSTIC
// ======================================================

// Available only in development.
//
// Protected with requireAuth so database information
// is not exposed to unauthenticated callers.
if (env.NODE_ENV === "development") {
  app.get(
    "/api/health/database",
    requireAuth,
    async (req, res) => {
      try {
        const database =
          await checkDatabaseConnection();

        return res.status(200).json({
          success: true,
          message: "Supabase connected successfully",
          database,
        });
      } catch (error) {
        console.error(
          "Database health check failed:",
          error.message
        );

        return res.status(503).json({
          success: false,
          message: "Database connection failed",
        });
      }
    }
  );
}

// ======================================================
// 4. ROOT API INFORMATION
// ======================================================

// Public application information.
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    application: "GrowPilot AI",
    version: "1.0.0",
  });
});

// ======================================================
// 5. PROTECTED BUSINESS API ROUTES
// ======================================================

/**
 * Authentication:
 *
 * All business API requests must contain:
 *
 * Authorization: Bearer <supabase_access_token>
 *
 * requireAuth verifies the Supabase user identity.
 *
 * IMPORTANT:
 * Authentication alone does not authorize access
 * to a particular business.
 *
 * Route-specific business authorization will be
 * added in the next development step.
 */

// Business APIs
app.use(
  "/api/businesses",
  requireAuth,
  businessRoutes
);

// Dashboard APIs
app.use(
  "/api/dashboard",
  requireAuth,
  dashboardRoutes
);

// Customer APIs
app.use(
  "/api/customers",
  requireAuth,
  customerRoutes
);

// AI Agent APIs
app.use(
  "/api/agent",
  requireAuth,
  agentRoutes
);

// Analytics APIs
app.use(
  "/api/analytics",
  requireAuth,
  analyticsRoutes
);

// Approval APIs
app.use(
  "/api/approvals",
  requireAuth,
  approvalRoutes
);

// ======================================================
// 6. UNKNOWN ROUTES
// ======================================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// ======================================================
// 7. GLOBAL ERROR HANDLER
// ======================================================

app.use((err, req, res, next) => {
  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode < 600
      ? err.statusCode
      : 500;

  if (statusCode >= 500) {
    console.error("Unhandled API error:", err);
  }

  return res.status(statusCode).json({
    success: false,
    errorCode:
      err.code || "INTERNAL_SERVER_ERROR",
    message:
      statusCode >= 500
        ? "An internal server error occurred"
        : err.message,
  });
});

export default app;
